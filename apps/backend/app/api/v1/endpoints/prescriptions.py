import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionOrderPlacementResponse, PrescriptionListItem, PrescriptionItemResponse
from app.services.prescription import PrescriptionService
from app.services.qr_pdf_service import QRPdfService
from sqlalchemy import select
from app.models.pharmacy_system import MedicineOrder
from app.models.prescription import Prescription, PrescriptionItem
from sqlalchemy import or_
from fastapi import HTTPException

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])

DOWNLOAD_PIN_CACHE: dict[str, str] = {}
DOWNLOAD_BYTES_CACHE: dict[str, bytes] = {}

@router.get("/", response_model=APIResponse[list[PrescriptionListItem]])
async def list_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    from app.models.patient import Patient
    from app.models.doctor import Doctor
    from app.models.user import UserRole
    
    role_str = str(current_user.role).upper()
    stmt = select(Prescription).order_by(Prescription.created_at.desc())
    
    if role_str == UserRole.DOCTOR.value:
        doc_stmt = select(Doctor).where(Doctor.user_id == current_user.id)
        doc_res = await db.execute(doc_stmt)
        doc_prof = doc_res.scalar_one_or_none()
        doc_ids = [current_user.id]
        if doc_prof:
            doc_ids.append(doc_prof.id)
        stmt = stmt.where(Prescription.doctor_id.in_(doc_ids))
    elif role_str == UserRole.PATIENT.value:
        stmt = stmt.where(Prescription.patient_id == current_user.id)
    elif role_str == UserRole.ADMIN.value:
        pass
    else:
        stmt = stmt.limit(50)

    result = await db.execute(stmt)
    prescriptions = result.scalars().all()
    
    patient_ids = list({p.patient_id for p in prescriptions if p.patient_id})
    pat_map = {}
    if patient_ids:
        pat_stmt = select(Patient).where(Patient.user_id.in_(patient_ids))
        pat_res = await db.execute(pat_stmt)
        for pat in pat_res.scalars().all():
            pat_map[pat.user_id] = pat.full_name
            
    rx_ids = [p.id for p in prescriptions]
    items_map: dict[uuid.UUID, list[PrescriptionItem]] = {rid: [] for rid in rx_ids}
    if rx_ids:
        items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id.in_(rx_ids))
        items_res = await db.execute(items_stmt)
        for it in items_res.scalars().all():
            items_map[it.prescription_id].append(it)
            
    items_out = []
    for rx in prescriptions:
        raw_items = items_map.get(rx.id, [])
        item_models = [
            PrescriptionItemResponse(
                id=i.id,
                medicine_name=i.medicine_name,
                dosage=i.dosage,
                frequency=i.frequency,
                duration_days=i.duration_days,
                instructions=i.instructions
            )
            for i in raw_items
        ]
        items_out.append(
            PrescriptionListItem(
                id=rx.id,
                appointment_id=rx.appointment_id,
                patient_id=rx.patient_id,
                doctor_id=rx.doctor_id,
                diagnosis=rx.diagnosis,
                notes=rx.notes,
                is_finalized=rx.is_finalized,
                is_dispensed=rx.is_dispensed,
                created_at=rx.created_at,
                pdf_url=rx.pdf_url,
                qr_token=rx.qr_token,
                patient_name=pat_map.get(rx.patient_id, "Patient"),
                prescription_items=item_models
            )
        )
        
    return APIResponse(message="Prescriptions retrieved successfully", data=items_out)

@router.post("/", response_model=APIResponse[PrescriptionResponse], status_code=status.HTTP_201_CREATED)
async def create_prescription(
    req: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    if not req.pin:
        raise HTTPException(status_code=400, detail="Doctor Authorization PIN is required.")

    from app.services.security_service import validate_doctor_pin
    is_valid = await validate_doctor_pin(db, current_user.id, req.pin)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    rx = await PrescriptionService.create_prescription(db, current_user.id, req)
    return APIResponse(message="Prescription finalized", data=rx)

@router.post("/{id}/authorize-download", response_model=APIResponse)
async def authorize_prescription_download(
    id: uuid.UUID,
    pin: str = Form(None),
    face_image: UploadFile = File(None),
    challenge_type: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    from sqlalchemy import select
    from app.models.prescription import Prescription
    from fastapi import HTTPException
    
    stmt = select(Prescription).where(Prescription.id == id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if rx.patient_id != current_user.id and rx.doctor_id != current_user.id and str(current_user.role).upper() != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Unauthorized to download this prescription")

    # If the user is the patient, enforce MFA (PDF is fetched or reconstructed on download if pdf_url is empty)
    if str(current_user.role).upper() == UserRole.PATIENT.value:
        from app.models.user import User
        from app.services.security_service import validate_patient_pin, create_download_authorization
        from app.services.face_auth_service import face_auth_service
        from app.models.security import PatientBiometricProfile
        import asyncio
        import tempfile, shutil, os

        # If both are missing, raise error
        if not pin and not face_image:
            raise HTTPException(status_code=400, detail="Either PIN or Face Image is required")

        # Track what verified
        pin_verified = False
        face_verified = False
        
        if pin and not face_image:
            pin_valid = await validate_patient_pin(db, current_user.id, pin)
            if not pin_valid:
                raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")
            pin_verified = True

        if face_image:
            bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id)
            bio_res = await db.execute(bio_stmt)
            bio_profile = bio_res.scalar_one_or_none()

            if not bio_profile:
                raise HTTPException(status_code=400, detail="Biometric profile not enrolled.")

            # Save face image temporarily to verify
            suffix = f".{face_image.filename.split('.')[-1]}" if '.' in face_image.filename else ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(face_image.file, tmp)
                tmp_path = tmp.name

            try:
                challenge_data = {"type": challenge_type} if challenge_type else None
                fv = await asyncio.to_thread(face_auth_service.verify_patient, bio_profile.encrypted_template, tmp_path, challenge_data)
                if not fv or not fv.get("verified"):
                    raise HTTPException(status_code=401, detail="Face verification failed")
                
                # Face auth resets PIN lockout
                from app.models.security import PatientSecurityCredential
                cred_stmt = select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == current_user.id)
                cred_res = await db.execute(cred_stmt)
                cred = cred_res.scalar_one_or_none()
                if cred:
                    cred.failed_attempts = 0
                    cred.locked_until = None
                    await db.commit()
                face_verified = True
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        auth_ref = await create_download_authorization(db, current_user.id, rx.id, password_verified=False, pin_verified=pin_verified, face_verified=face_verified)
        if pin:
            DOWNLOAD_PIN_CACHE[auth_ref] = pin
        return APIResponse(message="Authorization successful", data={"authorization_reference": auth_ref})
    
    # For doctors/admins, just return a direct short-lived auth reference bypassing MFA
    from app.services.security_service import create_download_authorization
    auth_ref = await create_download_authorization(db, current_user.id, rx.id, password_verified=False, pin_verified=False, face_verified=False)
    return APIResponse(message="Authorization successful", data={"authorization_reference": auth_ref})

@router.get("/{id}/download")
async def download_prescription_file(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    from fastapi.responses import Response
    from app.models.prescription import Prescription, PrescriptionItem
    from app.models.doctor import Doctor
    from app.models.patient import Patient
    from app.services.storage import StorageService
    from app.services.qr_pdf_service import QRPdfService

    stmt = select(Prescription).where(Prescription.id == id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()

    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if rx.patient_id != current_user.id and rx.doctor_id != current_user.id and str(current_user.role).upper() != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Unauthorized to download this prescription")

    pdf_content = DOWNLOAD_BYTES_CACHE.pop(str(rx.id), None)
    if not pdf_content and rx.pdf_url:
        try:
            pdf_content = await StorageService.download_record_file(rx.pdf_url)
        except Exception as e:
            import logging
            logging.getLogger("medsync.prescriptions").warning(f"Could not download PDF from storage for {rx.id}: {e}")

    if not pdf_content:
        # Re-generate on demand using QRPdfService
        doc_stmt = select(Doctor).where(Doctor.user_id == rx.doctor_id)
        doc_res = await db.execute(doc_stmt)
        doc_prof = doc_res.scalar_one_or_none()

        pat_stmt = select(Patient).where(Patient.user_id == rx.patient_id)
        pat_res = await db.execute(pat_stmt)
        pat_prof = pat_res.scalar_one_or_none()

        doctor_data = {
            "name": doc_prof.full_name if doc_prof else "Doctor",
            "profile_image_url": rx.doctor_profile_image_url or (getattr(doc_prof, "profile_image", None) if doc_prof else None),
            "medical_council_reg_number": getattr(doc_prof, "medical_council_reg_number", None) or getattr(doc_prof, "license_number", "N/A"),
            "clinic_name": getattr(doc_prof, "clinic_name", None) or getattr(doc_prof, "hospital_name", "MedSync Hospital"),
        }
        patient_data = {"name": pat_prof.full_name if pat_prof else "Patient", "id": str(rx.patient_id)}

        items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
        items_res = await db.execute(items_stmt)
        items_list = [
            {
                "medicine_name": i.medicine_name,
                "dosage": i.dosage,
                "frequency": i.frequency,
                "duration_days": i.duration_days,
                "instructions": getattr(i, "instructions", None) or getattr(i, "special_instructions", None) or "",
            }
            for i in items_res.scalars().all()
        ]

        qr_tok = rx.qr_token or f"MS-RX-{rx.id}"
        qr_img = QRPdfService.generate_qr_code(qr_tok)
        rx_dict = {"diagnosis": rx.diagnosis or "Clinical Prescription", "notes": rx.notes}
        pdf_stream = QRPdfService.generate_prescription_pdf(
            rx_dict, patient_data, doctor_data, items_list, qr_img, qr_token=qr_tok, pin=rx.pin
        )
        pdf_content = pdf_stream.getvalue() if hasattr(pdf_stream, "getvalue") else pdf_stream.read()

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="prescription_{rx.id}.pdf"'
        }
    )

@router.get("/download/{authorization_reference}")
async def download_prescription_by_ref(
    authorization_reference: str,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select, text
    from app.models.security import PrescriptionDownloadAuthorization
    from app.models.prescription import Prescription
    from app.services.storage import StorageService
    from fastapi import HTTPException
    import datetime

    stmt = select(PrescriptionDownloadAuthorization).where(PrescriptionDownloadAuthorization.authorization_reference == authorization_reference)
    result = await db.execute(stmt)
    auth = result.scalar_one_or_none()

    if not auth:
        raise HTTPException(status_code=404, detail="Invalid authorization reference")

    if auth.used_at:
        raise HTTPException(status_code=403, detail="Authorization reference already used")

    if auth.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Authorization reference expired")

    # Mark as used
    auth.used_at = datetime.datetime.utcnow()
    await db.commit()

    # Get prescription
    rx_stmt = select(Prescription).where(Prescription.id == auth.prescription_id)
    rx_res = await db.execute(rx_stmt)
    rx = rx_res.scalar_one_or_none()

    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Fetch raw PDF bytes from storage or reconstruct dynamically on-demand
    raw_pdf_bytes = None
    if rx.pdf_url:
        try:
            raw_pdf_bytes = await StorageService.download_record_file(rx.pdf_url)
        except Exception as e:
            import logging
            logging.getLogger("medsync.prescriptions").warning(f"Storage download failed for prescription {rx.id}: {e}")

    if not raw_pdf_bytes:
        from app.models.prescription import PrescriptionItem
        from app.models.doctor import Doctor
        from app.models.patient import Patient

        doc_stmt = select(Doctor).where(Doctor.user_id == rx.doctor_id)
        doc_res = await db.execute(doc_stmt)
        doc_prof = doc_res.scalar_one_or_none()

        pat_stmt = select(Patient).where(Patient.user_id == rx.patient_id)
        pat_res = await db.execute(pat_stmt)
        pat_prof = pat_res.scalar_one_or_none()

        doctor_data = {
            "name": doc_prof.full_name if doc_prof else "Doctor",
            "profile_image_url": rx.doctor_profile_image_url or (getattr(doc_prof, "profile_image", None) if doc_prof else None),
            "medical_council_reg_number": getattr(doc_prof, "medical_council_reg_number", None) or getattr(doc_prof, "license_number", "N/A"),
            "clinic_name": getattr(doc_prof, "clinic_name", None) or getattr(doc_prof, "hospital_name", "MedSync Hospital"),
        }
        patient_data = {"name": pat_prof.full_name if pat_prof else "Patient", "id": str(rx.patient_id)}

        items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
        items_res = await db.execute(items_stmt)
        items_list = [
            {
                "medicine_name": i.medicine_name,
                "dosage": i.dosage,
                "frequency": i.frequency,
                "duration_days": i.duration_days,
                "instructions": getattr(i, "instructions", None) or getattr(i, "special_instructions", None) or "",
            }
            for i in items_res.scalars().all()
        ]

        qr_tok = rx.qr_token or f"MS-RX-{rx.id}"
        qr_img = QRPdfService.generate_qr_code(qr_tok)
        rx_dict = {"diagnosis": rx.diagnosis or "Clinical Prescription", "notes": rx.notes}
        pdf_stream = QRPdfService.generate_prescription_pdf(
            rx_dict, patient_data, doctor_data, items_list, qr_img, qr_token=qr_tok, pin=rx.pin
        )
        raw_pdf_bytes = pdf_stream.getvalue() if hasattr(pdf_stream, "getvalue") else pdf_stream.read()

    # Check if a PIN was used to authorize this download
    pin = DOWNLOAD_PIN_CACHE.pop(authorization_reference, None)
    final_pdf_bytes = raw_pdf_bytes
    if pin:
        try:
            final_pdf_bytes = QRPdfService.encrypt_pdf(raw_pdf_bytes, pin)
        except Exception as e:
            import logging
            logging.getLogger("medsync.prescriptions").error(f"Error encrypting PDF with PIN: {e}", exc_info=True)

    # Cache bytes temporarily so download_prescription_file can immediately stream them if accessed directly
    DOWNLOAD_BYTES_CACHE[str(rx.id)] = final_pdf_bytes

    # Try storing and generating signed URL, or fallback to direct download URL
    try:
        suffix = "encrypted" if pin else "authorized"
        enc_object_path, _, _, _ = await StorageService.upload_prescription_bytes(
            file_bytes=final_pdf_bytes,
            filename=f"prescription_{rx.id}_{suffix}.pdf",
            content_type="application/pdf",
            patient_id=str(rx.patient_id),
            prescription_id=str(rx.id),
        )
        signed_url = await StorageService.create_signed_download_url(enc_object_path, expires_in=600)
        return APIResponse(message="Download URL generated", data={"url": signed_url})
    except Exception as e:
        import logging
        logging.getLogger("medsync.prescriptions").warning(f"Storage upload fallback to streaming for prescription {rx.id}: {e}")
        return APIResponse(message="Download URL generated", data={"url": f"/api/v1/prescriptions/{rx.id}/download"})

@router.post("/{id}/dispense", response_model=APIResponse)
async def dispense_prescription(
    id: uuid.UUID,
    pin: str = Form(None),
    auth_pin: str = Form(...),
    fulfillment_type: str = Form("DISPENSED_AND_DELIVERED"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PHARMACY]))
):
    from app.services.security_service import validate_pharmacy_pin
    is_valid = await validate_pharmacy_pin(db, current_user.id, auth_pin)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    stmt = select(Prescription).where(Prescription.id == id).with_for_update()
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    # Prescription PIN not required from pharmacy; fulfillment authorized via pharmacy auth_pin
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")
        
    rx.is_dispensed = True
    is_delivery = str(fulfillment_type).upper() in ("DELIVERED", "DISPENSED_AND_DELIVERED")

    # 1. Fetch Patient and Pharmacy profiles
    from app.models.patient import Patient
    from app.models.pharmacy import Pharmacy
    from app.models.pharmacy_system import MedicineOrder, MedicineOrderItem, MedicineInventory, Medicine, OrderStatus
    from app.models.dispensing_log import PrescriptionDispensingLog
    from app.models.prescription import PrescriptionItem
    from sqlalchemy import or_

    patient_stmt = select(Patient).where(Patient.user_id == rx.patient_id)
    patient_res = await db.execute(patient_stmt)
    patient = patient_res.scalar_one_or_none()
    
    pharmacy_stmt = select(Pharmacy).where(Pharmacy.user_id == current_user.id)
    pharmacy_res = await db.execute(pharmacy_stmt)
    pharmacy = pharmacy_res.scalar_one_or_none()

    # 2. Get prescription items
    rx_items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
    rx_items_res = await db.execute(rx_items_stmt)
    rx_items = rx_items_res.scalars().all()

    # 3. Check or create MedicineOrder for this fulfillment (links patient & pharmacy)
    order_stmt = (
        select(MedicineOrder)
        .where(MedicineOrder.prescription_id == id)
        .order_by(MedicineOrder.created_at.desc())
    )
    order_res = await db.execute(order_stmt)
    all_orders = order_res.scalars().all()
    order = all_orders[0] if all_orders else None

    order_status_val = OrderStatus.OUT_FOR_DELIVERY if is_delivery else OrderStatus.RECEIVED_BY_PATIENT
    order_type_val = "ONLINE_DELIVERY" if is_delivery else "WALK_IN_PICKUP"
    patient_addr = (patient.address if patient and patient.address else "Walk-in Counter Pickup") if not is_delivery else (patient.address if patient and patient.address else "Bangalore Central")

    if not order:
        order = MedicineOrder(
            patient_id=rx.patient_id,
            pharmacy_id=current_user.id,
            prescription_id=rx.id,
            status=order_status_val,
            order_type=order_type_val,
            total_amount=0.0,
            delivery_address=patient_addr
        )
        db.add(order)
        await db.flush()
    else:
        order.status = order_status_val
        order.order_type = order_type_val
        if not order.pharmacy_id:
            order.pharmacy_id = current_user.id
        for other_ord in all_orders[1:]:
            if other_ord.status in (OrderStatus.PENDING, OrderStatus.PROCESSING):
                other_ord.status = order_status_val

    # 4. Inventory Decrement & Line Item Sales
    total_order_amount = 0.0

    for item in rx_items:
        # Match against pharmacy inventory by medicine name / brand / generic name
        inv_stmt = select(MedicineInventory, Medicine).join(
            Medicine, MedicineInventory.medicine_id == Medicine.id
        ).where(
            MedicineInventory.pharmacy_id == current_user.id,
            or_(
                Medicine.name.ilike(f"%{item.medicine_name}%"),
                Medicine.generic_name.ilike(f"%{item.medicine_name}%"),
                Medicine.brand_name.ilike(f"%{item.medicine_name}%")
            )
        ).order_by(MedicineInventory.expiry_date.asc())
        
        inv_res = await db.execute(inv_stmt)
        matched_row = inv_res.first()

        item_qty = 1  # 1 unit/course
        if matched_row:
            inv_obj, med_obj = matched_row
            # Decrement stock
            inv_obj.stock_quantity = max(0, inv_obj.stock_quantity - item_qty)
            unit_price = float(inv_obj.selling_price or inv_obj.unit_price or 18.50)
            line_total = unit_price * item_qty
            total_order_amount += line_total

            # Record item in order
            db.add(MedicineOrderItem(
                order_id=order.id,
                inventory_id=inv_obj.id,
                quantity=item_qty,
                price_at_purchase=unit_price
            ))
        else:
            # Fallback: Find any available inventory item for this pharmacy to decrement stock
            fallback_inv_stmt = select(MedicineInventory).where(
                MedicineInventory.pharmacy_id == current_user.id,
                MedicineInventory.stock_quantity > 0
            ).order_by(MedicineInventory.expiry_date.asc())
            fallback_res = await db.execute(fallback_inv_stmt)
            fallback_inv = fallback_res.scalars().first()
            if fallback_inv:
                fallback_inv.stock_quantity = max(0, fallback_inv.stock_quantity - item_qty)
                price_val = float(fallback_inv.selling_price or fallback_inv.unit_price or 15.0)
                total_order_amount += price_val
                db.add(MedicineOrderItem(
                    order_id=order.id,
                    inventory_id=fallback_inv.id,
                    quantity=item_qty,
                    price_at_purchase=price_val
                ))
            else:
                total_order_amount += 17.00

    if total_order_amount <= 0.0:
        total_order_amount = max(34.00, len(rx_items) * 17.00)

    order.total_amount = round(total_order_amount, 2)

    # 5. Delivery Route Calculation (Simulation for Bangalore delivery)
    delivery_route = None
    estimated_minutes = 10 if is_delivery else 0
    
    if is_delivery and patient and pharmacy:
        from app.services.delivery_route_service import delivery_route_service
        patient_locations = delivery_route_service.get_bangalore_patient_locations()
        pharmacy_locations = delivery_route_service.get_bangalore_pharmacy_locations()
        
        patient_idx = int(str(rx.patient_id)[-1], 16) % len(patient_locations)
        pharmacy_idx = int(str(current_user.id)[-1], 16) % len(pharmacy_locations)
        
        patient_loc = patient_locations[patient_idx]
        pharmacy_loc = pharmacy_locations[pharmacy_idx]
        
        try:
            route_data = await delivery_route_service.calculate_route(
                pharmacy_loc["lat"],
                pharmacy_loc["lon"],
                patient_loc["lat"],
                patient_loc["lon"]
            )
            delivery_route = route_data
            estimated_minutes = route_data.get("estimated_minutes", 12)
        except Exception as e:
            logging.getLogger("medsync.prescription").warning(f"Route calculation failed: {e}")

    # 6. Create PrescriptionDispensingLog
    patient_phone = (patient.phone_number or patient.contact_number) if patient else None
    pharmacy_phone = (pharmacy.contact_number or pharmacy.phone_number) if pharmacy else None
    disp_status_val = "DISPATCHED" if is_delivery else "RECEIVED_BY_PATIENT"

    medicines_list = [
        {"medicine_name": i.medicine_name, "dosage": i.dosage, "quantity": 1}
        for i in rx_items
    ]

    dispensing_log = PrescriptionDispensingLog(
        prescription_id=rx.id,
        pharmacy_id=current_user.id,
        patient_id=rx.patient_id,
        dispensed_by_name=pharmacy.business_name if pharmacy else "Partner Pharmacy",
        medicines_prescribed=medicines_list,
        medicines_dispensed=medicines_list,
        prescribed_count=len(rx_items),
        dispensed_count=len(rx_items),
        patient_contact=patient_phone,
        pharmacy_contact=pharmacy_phone,
        delivery_status=disp_status_val,
        delivery_started_at=datetime.utcnow(),
        delivery_completed_at=None if is_delivery else datetime.utcnow(),
        estimated_delivery_minutes=estimated_minutes,
        delivery_route=delivery_route,
        notes=f"Fulfillment: {'Dispensed & Delivered' if is_delivery else 'Received by Patient (Walk-in Counter)'}"
    )
    db.add(dispensing_log)

    # 6b. Create or update DeliveryTracking for live patient order tracking
    try:
        from app.models.pharmacy_system import DeliveryTracking
        import random
        from datetime import timedelta

        trk_stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order.id)
        trk_res = await db.execute(trk_stmt)
        tracking = trk_res.scalar_one_or_none()

        if is_delivery:
            drivers = [
                ("Rahul Kumar", "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul", "KA-01-AB-1234", "Electric Bike"),
                ("Amit Singh", "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit", "KA-03-CD-5678", "Scooter"),
                ("Kiran Desai", "https://api.dicebear.com/7.x/avataaars/svg?seed=Kiran", "KA-05-EF-9012", "Bike"),
                ("Arjun Reddy", "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun", "KA-02-GH-3456", "Electric Scooter")
            ]
            driver = random.choice(drivers)
            if not tracking:
                tracking = DeliveryTracking(
                    order_id=order.id,
                    tracking_number=f"TRK-BLR-{random.randint(1000, 9999)}",
                    current_status="OUT_FOR_DELIVERY",
                    delivery_partner="MedSync Express",
                    delivery_started_at=datetime.utcnow(),
                    delivery_eta=datetime.utcnow() + timedelta(minutes=estimated_minutes or 15),
                    driver_name=driver[0],
                    driver_avatar=driver[1],
                    vehicle_number=driver[2],
                    vehicle_type=driver[3],
                    delivery_speed=40,
                    start_latitude=12.9229,
                    start_longitude=77.6175,
                    end_latitude=12.9716,
                    end_longitude=77.5946,
                    current_latitude=12.9229,
                    current_longitude=77.6175,
                    delivery_progress=25,
                )
                db.add(tracking)
            else:
                tracking.current_status = "OUT_FOR_DELIVERY"
                tracking.delivery_started_at = datetime.utcnow()
                tracking.delivery_eta = datetime.utcnow() + timedelta(minutes=estimated_minutes or 15)
                tracking.delivery_progress = max(25, tracking.delivery_progress or 0)
        else:
            if tracking:
                tracking.current_status = "DELIVERED"
                tracking.delivery_completed_at = datetime.utcnow()
                tracking.delivery_progress = 100
    except Exception as trk_err:
        import logging
        logging.getLogger("medsync.dispense").warning(f"Error updating DeliveryTracking: {trk_err}")

    # 6c. Send notification to patient about dispense / delivery
    try:
        from app.services.notification import NotificationService
        notif_msg = (
            f"Your prescription #{str(rx.id)[:8]} has been dispensed and is out for delivery! Track your order live."
            if is_delivery
            else f"Your prescription #{str(rx.id)[:8]} has been dispensed and collected at the pharmacy counter."
        )
        await NotificationService.send_notification(
            db,
            user_id=rx.patient_id,
            title="Order Out for Delivery" if is_delivery else "Prescription Dispensed",
            message=notif_msg,
            type="ORDER",
            link=f"/patient/tracking/{order.id}" if is_delivery else "/patient/records"
        )
    except Exception as n_err:
        import logging
        logging.getLogger("medsync.dispense").warning(f"Notification error: {n_err}")

    await db.commit()
    
    # 7. Broadcast state-changing dispensing event to PrescriptionRegistry on Polygon Amoy
    try:
        from app.services.blockchain_sync import BlockchainSyncService, trigger_background_sync
        from app.models.blockchain import SyncEntityType, SyncActionType
        dispense_task = await BlockchainSyncService.enqueue_sync_task(
            db=db,
            entity_type=SyncEntityType.PRESCRIPTION,
            entity_id=rx.id,
            action_type=SyncActionType.VERIFY,
            payload={
                "prescription_id": str(rx.id),
                "prescription_hash": rx.hash,
                "hash": rx.hash,
                "patient_id": str(rx.patient_id),
                "doctor_id": str(rx.doctor_id),
                "diagnosis": rx.diagnosis
            }
        )
        await db.commit()
        trigger_background_sync(dispense_task.id)
    except Exception as b_err:
        import logging
        logging.getLogger("medsync.dispense").warning(f"Error queueing blockchain dispensing task: {b_err}")
    
    fulfillment_label = "Dispensed & Delivered" if is_delivery else "Received by Patient"
    return APIResponse(
        message=f"Prescription successfully fulfilled ({fulfillment_label})",
        data={
            "prescription_id": str(rx.id),
            "order_id": str(order.id),
            "patient_name": patient.full_name if patient else "Walk-in Customer",
            "patient_contact": patient_phone,
            "fulfillment_type": "DISPENSED_AND_DELIVERED" if is_delivery else "RECEIVED_BY_PATIENT",
            "fulfillment_label": fulfillment_label,
            "total_sales": float(order.total_amount),
            "profit": round(float(order.total_amount) * 0.30, 2),
            "items_dispensed": len(rx_items),
            "delivery_tracking": {
                "status": disp_status_val,
                "estimated_minutes": estimated_minutes,
                "route_available": delivery_route is not None
            }
        }
    )

@router.post("/{id}/verify", response_model=APIResponse)
async def verify_prescription_auth(
    id: uuid.UUID,
    pin: str = Form(None),
    face_image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PHARMACY]))
):
    # Fetch prescription and patient
    stmt = select(Prescription).where(Prescription.id == id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")

    from app.services.security_service import validate_patient_pin
    from app.services.face_auth_service import face_auth_service
    from app.models.security import PatientBiometricProfile
    import tempfile, shutil, os, asyncio

    if not pin and not face_image:
        raise HTTPException(status_code=400, detail="Either PIN or Face Image is required")

    # Authorize using either PIN or Face
    if pin and not face_image:
        pin_valid = await validate_patient_pin(db, rx.patient_id, pin)
        if not pin_valid:
            raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")
            
    if face_image:
        bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == rx.patient_id)
        bio_res = await db.execute(bio_stmt)
        bio_profile = bio_res.scalar_one_or_none()
        
        if not bio_profile:
            raise HTTPException(status_code=400, detail="Biometric profile not enrolled.")
            
        suffix = f".{face_image.filename.split('.')[-1]}" if '.' in face_image.filename else ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(face_image.file, tmp)
            tmp_path = tmp.name

        try:
            fv = await asyncio.to_thread(face_auth_service.verify_patient, bio_profile.encrypted_template, tmp_path)
            if not fv or not fv.get("verified"):
                raise HTTPException(status_code=401, detail="Face verification failed")
                
            from app.models.security import PatientSecurityCredential
            cred_stmt = select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == rx.patient_id)
            cred_res = await db.execute(cred_stmt)
            cred = cred_res.scalar_one_or_none()
            if cred:
                cred.failed_attempts = 0
                cred.locked_until = None
                await db.commit()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
    # Enqueue Blockchain Sync for Verification (Status Update)
    try:
        from app.services.blockchain_sync import BlockchainSyncService
        from app.models.blockchain import SyncEntityType, SyncActionType
        
        await BlockchainSyncService.enqueue_sync_task(
            db=db,
            entity_type=SyncEntityType.PRESCRIPTION,
            entity_id=rx.id,
            action_type=SyncActionType.UPDATE,
            payload={
                "action": "VERIFY",
                "pharmacy_id": str(current_user.id)
            }
        )
        await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Blockchain sync failed for prescription {rx.id}: {e}")
        
    from app.models.prescription import PrescriptionItem
    items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
    items_res = await db.execute(items_stmt)
    items = [{"medicine_name": i.medicine_name, "dosage": i.dosage, "frequency": i.frequency, "duration_days": i.duration_days} for i in items_res.scalars().all()]
    
    return APIResponse(message="Prescription verified successfully", data={
        "prescription_id": str(rx.id),
        "diagnosis": rx.diagnosis,
        "items": items,
        "notes": rx.notes
    })

from fastapi import Form, UploadFile, File

@router.post("/{id}/order-online", response_model=APIResponse[PrescriptionOrderPlacementResponse])
async def order_prescription_online(
    id: uuid.UUID,
    pharmacy_id: uuid.UUID = Form(...),
    delivery_address: str = Form(...),
    delivery_latitude: float = Form(None),
    delivery_longitude: float = Form(None),
    pin: str = Form(None),
    face_image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PATIENT]))
):
    # Fetch prescription
    stmt = select(Prescription).where(Prescription.id == id, Prescription.patient_id == current_user.id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")
    if not rx.is_finalized:
        raise HTTPException(status_code=400, detail="Prescription is not finalized")
    if rx.is_revoked:
        raise HTTPException(status_code=400, detail="Prescription has been revoked")
    if rx.expires_at:
        try:
            from datetime import datetime, timezone
            exp = datetime.fromisoformat(str(rx.expires_at).replace("Z", "+00:00")) if isinstance(rx.expires_at, str) else rx.expires_at
            if hasattr(exp, 'replace'):
                exp = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Prescription has expired")
        except (ValueError, TypeError):
            pass

    from app.services.security_service import validate_patient_pin
    from app.services.face_auth_service import face_auth_service
    from app.models.security import PatientBiometricProfile
    import tempfile, shutil, os, asyncio

    if not pin and not face_image:
        raise HTTPException(status_code=400, detail="Either PIN or Face Image is required")

    # Validate PIN
    if pin and not face_image:
        pin_valid = await validate_patient_pin(db, current_user.id, pin)
        if not pin_valid:
            raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    # Validate Face
    if face_image:
        bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id)
        bio_res = await db.execute(bio_stmt)
        bio_profile = bio_res.scalar_one_or_none()
        
        if not bio_profile:
            raise HTTPException(status_code=400, detail="Biometric profile not enrolled.")
            
        suffix = f".{face_image.filename.split('.')[-1]}" if '.' in face_image.filename else ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(face_image.file, tmp)
            tmp_path = tmp.name

        try:
            fv = await asyncio.to_thread(face_auth_service.verify_patient, bio_profile.encrypted_template, tmp_path)
            if not fv or not fv.get("verified"):
                raise HTTPException(status_code=401, detail="Face verification failed")
                
            from app.models.security import PatientSecurityCredential
            cred_stmt = select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == current_user.id)
            cred_res = await db.execute(cred_stmt)
            cred = cred_res.scalar_one_or_none()
            if cred:
                cred.failed_attempts = 0
                cred.locked_until = None
                await db.commit()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
    from app.models.pharmacy import Pharmacy
    from app.models.user import User
    from sqlalchemy import or_

    # Resolve target pharmacy user_id (pharmacy_id may be Pharmacy.id or User.id)
    pharm_stmt = select(Pharmacy).where(or_(Pharmacy.id == pharmacy_id, Pharmacy.user_id == pharmacy_id))
    pharm_res = await db.execute(pharm_stmt)
    target_pharm = pharm_res.scalar_one_or_none()

    if target_pharm:
        resolved_pharmacy_user_id = target_pharm.user_id
    else:
        u_stmt = select(User).where(User.id == pharmacy_id, User.role == UserRole.PHARMACY)
        u_res = await db.execute(u_stmt)
        user_match = u_res.scalar_one_or_none()
        if not user_match:
            raise HTTPException(status_code=404, detail="Selected pharmacy not found or invalid.")
        resolved_pharmacy_user_id = user_match.id

    from app.models.pharmacy_system import MedicineOrder, MedicineOrderItem, MedicineInventory, Medicine, OrderStatus

    rx_items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
    rx_items_res = await db.execute(rx_items_stmt)
    rx_items = rx_items_res.scalars().all()

    order = MedicineOrder(
        id=uuid.uuid4(),
        pharmacy_id=resolved_pharmacy_user_id,
        patient_id=current_user.id,
        prescription_id=rx.id,
        status=OrderStatus.PENDING,
        delivery_address=delivery_address,
        delivery_latitude=delivery_latitude,
        delivery_longitude=delivery_longitude,
        order_type="ONLINE_DELIVERY",
        total_amount=0.0
    )
    db.add(order)
    await db.flush()

    total_order_amount = 0.0
    for item in rx_items:
        inv_stmt = select(MedicineInventory, Medicine).join(
            Medicine, MedicineInventory.medicine_id == Medicine.id
        ).where(
            MedicineInventory.pharmacy_id == resolved_pharmacy_user_id,
            or_(
                Medicine.name.ilike(f"%{item.medicine_name}%"),
                Medicine.generic_name.ilike(f"%{item.medicine_name}%"),
                Medicine.brand_name.ilike(f"%{item.medicine_name}%")
            )
        ).order_by(MedicineInventory.expiry_date.asc())
        inv_res = await db.execute(inv_stmt)
        matched_row = inv_res.first()

        item_qty = 1
        if matched_row:
            inv_obj, med_obj = matched_row
            unit_price = float(inv_obj.selling_price or inv_obj.unit_price or 18.50)
            inv_id = inv_obj.id
        else:
            fallback_inv_stmt = select(MedicineInventory).where(
                MedicineInventory.pharmacy_id == resolved_pharmacy_user_id
            ).order_by(MedicineInventory.expiry_date.asc())
            fallback_res = await db.execute(fallback_inv_stmt)
            fallback_inv = fallback_res.scalars().first()
            inv_id = fallback_inv.id if fallback_inv else None
            unit_price = float(fallback_inv.selling_price or fallback_inv.unit_price) if fallback_inv else 17.50

        if inv_id:
            db.add(MedicineOrderItem(
                order_id=order.id,
                inventory_id=inv_id,
                quantity=item_qty,
                price_at_purchase=unit_price
            ))
        total_order_amount += unit_price * item_qty

    if total_order_amount <= 0.0:
        total_order_amount = max(34.00, len(rx_items) * 17.00)

    order.total_amount = round(total_order_amount, 2)
    await db.commit()
    await db.refresh(order)

    try:
        from app.services.notification import NotificationService
        patient_name = getattr(current_user, "full_name", None) or "A patient"
        await NotificationService.send_notification(
            db,
            user_id=resolved_pharmacy_user_id,
            title="New Online Medicine Order",
            message=f"{patient_name} placed an online delivery order for prescription #{str(rx.id)[:8]}.",
            type="ORDER",
            link="/pharmacy/orders"
        )
    except Exception as e:
        import logging
        logging.getLogger("prescriptions").warning(f"Failed to send pharmacy order notification: {e}")
        
    return APIResponse(
        message="Prescription order placed successfully",
        data=PrescriptionOrderPlacementResponse(
            prescription_id=str(rx.id),
            order_id=str(order.id)
        )
    )

@router.post("/{id}/physical-pickup", response_model=APIResponse[PrescriptionOrderPlacementResponse])
async def physical_pickup_prescription(
    id: uuid.UUID,
    pharmacy_id: uuid.UUID = Form(...),
    pin: str = Form(None),
    face_image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PATIENT]))
):
    # Fetch prescription
    stmt = select(Prescription).where(Prescription.id == id, Prescription.patient_id == current_user.id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")
    if not rx.is_finalized:
        raise HTTPException(status_code=400, detail="Prescription is not finalized")
    if rx.is_revoked:
        raise HTTPException(status_code=400, detail="Prescription has been revoked")
    if rx.expires_at:
        try:
            from datetime import datetime, timezone
            exp = datetime.fromisoformat(str(rx.expires_at).replace("Z", "+00:00")) if isinstance(rx.expires_at, str) else rx.expires_at
            if hasattr(exp, 'replace'):
                exp = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Prescription has expired")
        except (ValueError, TypeError):
            pass

    from app.services.security_service import validate_patient_pin
    from app.services.face_auth_service import face_auth_service
    from app.models.security import PatientBiometricProfile
    import tempfile, shutil, os, asyncio

    if not pin and not face_image:
        raise HTTPException(status_code=400, detail="Either PIN or Face Image is required")

    # Authorize using either PIN or Face
    if pin and not face_image:
        pin_valid = await validate_patient_pin(db, current_user.id, pin)
        if not pin_valid:
            raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")
            
    if face_image:
        bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id)
        bio_res = await db.execute(bio_stmt)
        bio_profile = bio_res.scalar_one_or_none()
        
        if not bio_profile:
            raise HTTPException(status_code=400, detail="Biometric profile not enrolled.")
            
        suffix = f".{face_image.filename.split('.')[-1]}" if '.' in face_image.filename else ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(face_image.file, tmp)
            tmp_path = tmp.name

        try:
            fv = await asyncio.to_thread(face_auth_service.verify_patient, bio_profile.encrypted_template, tmp_path)
            if not fv or not fv.get("verified"):
                raise HTTPException(status_code=401, detail="Face verification failed")
                
            from app.models.security import PatientSecurityCredential
            cred_stmt = select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == current_user.id)
            cred_res = await db.execute(cred_stmt)
            cred = cred_res.scalar_one_or_none()
            if cred:
                cred.failed_attempts = 0
                cred.locked_until = None
                await db.commit()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
    from app.models.pharmacy import Pharmacy
    from app.models.user import User
    from sqlalchemy import or_

    # Resolve target pharmacy user_id (pharmacy_id may be Pharmacy.id or User.id)
    pharm_stmt = select(Pharmacy).where(or_(Pharmacy.id == pharmacy_id, Pharmacy.user_id == pharmacy_id))
    pharm_res = await db.execute(pharm_stmt)
    target_pharm = pharm_res.scalar_one_or_none()

    if target_pharm:
        resolved_pharmacy_user_id = target_pharm.user_id
    else:
        u_stmt = select(User).where(User.id == pharmacy_id, User.role == UserRole.PHARMACY)
        u_res = await db.execute(u_stmt)
        user_match = u_res.scalar_one_or_none()
        if not user_match:
            raise HTTPException(status_code=404, detail="Selected pharmacy not found or invalid.")
        resolved_pharmacy_user_id = user_match.id

    from app.models.pharmacy_system import MedicineOrder, MedicineOrderItem, MedicineInventory, Medicine, OrderStatus

    rx_items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
    rx_items_res = await db.execute(rx_items_stmt)
    rx_items = rx_items_res.scalars().all()

    order = MedicineOrder(
        id=uuid.uuid4(),
        pharmacy_id=resolved_pharmacy_user_id,
        patient_id=current_user.id,
        prescription_id=rx.id,
        status=OrderStatus.PENDING,
        order_type="PHYSICAL_PICKUP",
        total_amount=0.0
    )
    db.add(order)
    await db.flush()

    total_order_amount = 0.0
    for item in rx_items:
        inv_stmt = select(MedicineInventory, Medicine).join(
            Medicine, MedicineInventory.medicine_id == Medicine.id
        ).where(
            MedicineInventory.pharmacy_id == resolved_pharmacy_user_id,
            or_(
                Medicine.name.ilike(f"%{item.medicine_name}%"),
                Medicine.generic_name.ilike(f"%{item.medicine_name}%"),
                Medicine.brand_name.ilike(f"%{item.medicine_name}%")
            )
        ).order_by(MedicineInventory.expiry_date.asc())
        inv_res = await db.execute(inv_stmt)
        matched_row = inv_res.first()

        item_qty = 1
        if matched_row:
            inv_obj, med_obj = matched_row
            unit_price = float(inv_obj.selling_price or inv_obj.unit_price or 18.50)
            inv_id = inv_obj.id
        else:
            fallback_inv_stmt = select(MedicineInventory).where(
                MedicineInventory.pharmacy_id == resolved_pharmacy_user_id
            ).order_by(MedicineInventory.expiry_date.asc())
            fallback_res = await db.execute(fallback_inv_stmt)
            fallback_inv = fallback_res.scalars().first()
            inv_id = fallback_inv.id if fallback_inv else None
            unit_price = float(fallback_inv.selling_price or fallback_inv.unit_price) if fallback_inv else 17.50

        if inv_id:
            db.add(MedicineOrderItem(
                order_id=order.id,
                inventory_id=inv_id,
                quantity=item_qty,
                price_at_purchase=unit_price
            ))
        total_order_amount += unit_price * item_qty

    if total_order_amount <= 0.0:
        total_order_amount = max(34.00, len(rx_items) * 17.00)

    order.total_amount = round(total_order_amount, 2)
    await db.commit()
    await db.refresh(order)

    try:
        from app.services.notification import NotificationService
        patient_name = getattr(current_user, "full_name", None) or "A patient"
        await NotificationService.send_notification(
            db,
            user_id=resolved_pharmacy_user_id,
            title="Prescription Pickup Authorization",
            message=f"{patient_name} authorized in-store pickup for prescription #{str(rx.id)[:8]}.",
            type="ORDER",
            link="/pharmacy/orders"
        )
    except Exception as e:
        import logging
        logging.getLogger("prescriptions").warning(f"Failed to send pharmacy pickup notification: {e}")
        
    return APIResponse(
        message="Physical pickup authorized successfully",
        data=PrescriptionOrderPlacementResponse(
            prescription_id=str(rx.id),
            order_id=str(order.id)
        )
    )

@router.post("/offline", response_model=APIResponse)
async def upload_offline_prescription(
    file: UploadFile = File(...),
    notes: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PATIENT]))
):
    import uuid
    from app.services.storage import StorageService
    from app.models.prescription import Prescription
    
    prescription_id = uuid.uuid4()
    
    # Upload file
    file_bytes = await file.read()
    filename = f"offline_prescription_{prescription_id}_{file.filename}"
    
    object_path, _, _, file_hash = await StorageService.upload_prescription_bytes(
        file_bytes=file_bytes,
        filename=filename,
        content_type=file.content_type,
        patient_id=str(current_user.id),
        prescription_id=str(prescription_id),
    )
    
    rx = Prescription(
        id=prescription_id,
        patient_id=current_user.id,
        doctor_id=None,
        appointment_id=None,
        is_finalized=False,
        is_dispensed=False,
        is_revoked=False,
        pdf_url=object_path,
        original_file_hash=file_hash,
        notes=notes
    )
    db.add(rx)
    await db.commit()
    
    return APIResponse(message="Offline prescription uploaded successfully", data={"prescription_id": str(prescription_id)})

@router.post("/{id}/verify-offline", response_model=APIResponse)
async def verify_offline_prescription(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    from sqlalchemy import select
    from app.models.prescription import Prescription
    from app.services.qr_pdf_service import QRPdfService
    
    stmt = select(Prescription).where(Prescription.id == id).with_for_update()
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if rx.is_finalized:
        raise HTTPException(status_code=400, detail="Prescription is already finalized")
        
    if rx.is_revoked:
        raise HTTPException(status_code=400, detail="Prescription is revoked")
        
    rx.is_finalized = True
    rx.doctor_id = current_user.id
    
    import secrets
    from app.services.storage import StorageService
    
    import secrets
    qr_token = f"MS-{secrets.token_urlsafe(16)}"
    rx.qr_token = qr_token
    
    # Process PDF stamping
    try:
        # Download original PDF
        original_pdf_bytes = await StorageService.download_record_file(rx.pdf_url)
        
        # Stamp PDF
        qr_image_bytes = QRPdfService.generate_qr_code(qr_token)
        stamped_pdf_bytes = QRPdfService.stamp_qr_on_pdf(original_pdf_bytes, qr_image_bytes, qr_token)
        
        # Upload stamped PDF to dedicated prescriptions path
        new_filename = f"stamped_prescription_{rx.id}.pdf"
        new_object_path, _, _, _ = await StorageService.upload_prescription_bytes(
            file_bytes=stamped_pdf_bytes,
            filename=new_filename,
            content_type="application/pdf",
            patient_id=str(rx.patient_id),
            prescription_id=str(rx.id),
        )
        rx.pdf_url = new_object_path
    except Exception as e:
        # If stamping fails for any reason (e.g. encrypted or malformed PDF),
        # we log the error but still finalize the prescription with the token.
        import logging
        logging.getLogger(__name__).error(f"Failed to stamp PDF for {rx.id}: {e}")

    from app.utils.hash import build_offline_prescription_payload, generate_canonical_hash
    payload = build_offline_prescription_payload(
        doctor_id=str(current_user.id),
        patient_id=str(rx.patient_id),
        original_file_hash=str(rx.original_file_hash)
    )
    
    rx.hash = generate_canonical_hash(payload)
    
    await db.commit()
    
    # Enqueue blockchain task
    try:
        from app.services.blockchain_sync import BlockchainSyncService
        from app.models.blockchain import SyncEntityType, SyncActionType
        await BlockchainSyncService.enqueue_sync_task(
            db=db,
            entity_type=SyncEntityType.PRESCRIPTION,
            entity_id=rx.id,
            action_type=SyncActionType.CREATE,
            payload=payload
        )
        await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Blockchain sync failed for prescription {rx.id}: {e}")
    
    return APIResponse(message="Offline prescription verified successfully")

@router.post("/{id}/reject-offline", response_model=APIResponse)
async def reject_offline_prescription(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    from sqlalchemy import select
    from app.models.prescription import Prescription
    
    stmt = select(Prescription).where(Prescription.id == id).with_for_update()
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if rx.is_revoked:
        raise HTTPException(status_code=400, detail="Prescription is already revoked")
        
    rx.is_revoked = True
    rx.doctor_id = current_user.id
    await db.commit()
    
    return APIResponse(message="Offline prescription rejected successfully")
