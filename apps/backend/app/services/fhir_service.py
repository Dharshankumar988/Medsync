import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.hospital import Hospital
from app.models.appointment import Appointment
from app.models.prescription import Prescription, PrescriptionItem
from app.models.record import MedicalRecord, MedicalRecordVersion
from app.models.pharmacy_system import Medicine, MedicineOrder
from app.models.user import User
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.fhir import (
    Patient as FHIRPatient, Practitioner as FHIRPractitioner,
    Organization as FHIROrganization, Location as FHIRLocation,
    Appointment as FHIRAppointment, Medication as FHIRMedication,
    MedicationRequest as FHIRMedicationRequest, MedicationDispense as FHIRMedicationDispense,
    DocumentReference as FHIRDocumentReference, Bundle as FHIRBundle,
    BundleEntry, Identifier, HumanName, ContactPoint, Address, Reference,
    CodeableConcept
)
from app.core.exceptions import ForbiddenException, NotFoundException

class FHIRService:
    def __init__(self, db: AsyncSession, current_user: AuthenticatedPrincipal):
        self.db = db
        self.current_user = current_user

    async def _check_patient_access(self, patient_user_id: uuid.UUID) -> bool:
        if self.current_user.role == "admin":
            return True
        if self.current_user.id == patient_user_id:
            return True
        if self.current_user.role == "doctor":
            # For simplicity in this demo interoperability layer, 
            # allow doctors to access patient if there's an appointment.
            # Real implementation would check consent_history.
            stmt = select(Appointment).where(
                Appointment.doctor_id == self.current_user.id,
                Appointment.patient_id == patient_user_id
            )
            result = await self.db.execute(stmt)
            if result.scalars().first():
                return True
        if self.current_user.role == "pharmacy":
            stmt = select(MedicineOrder).where(
                MedicineOrder.pharmacy_id == self.current_user.id,
                MedicineOrder.patient_id == patient_user_id
            )
            result = await self.db.execute(stmt)
            if result.scalars().first():
                return True
        return False

    async def get_patient(self, patient_id: uuid.UUID) -> FHIRPatient:
        # Assuming patient_id is the user_id for the patient profile
        if not await self._check_patient_access(patient_id):
            raise ForbiddenException("Not authorized to access this patient's FHIR records")

        stmt = select(Patient).where(Patient.user_id == patient_id)
        result = await self.db.execute(stmt)
        patient_model = result.scalars().first()
        
        if not patient_model:
            raise NotFoundException("Patient not found")

        stmt_user = select(User).where(User.id == patient_id)
        result_user = await self.db.execute(stmt_user)
        user_model = result_user.scalars().first()
        email = user_model.email if user_model else None

        name_parts = patient_model.full_name.split(" ", 1)
        given = [name_parts[0]]
        family = name_parts[1] if len(name_parts) > 1 else None

        address = Address(
            text=patient_model.address,
            city=patient_model.city,
            state=patient_model.state,
            country=patient_model.country,
            postalCode=patient_model.pincode
        )

        telecom = []
        if patient_model.phone_number:
            telecom.append(ContactPoint(system="phone", value=patient_model.phone_number, use="mobile"))
        if email:
            telecom.append(ContactPoint(system="email", value=email, use="home"))

        return FHIRPatient(
            id=str(patient_model.id),
            identifier=[Identifier(system="medsync:patient_id", value=str(patient_model.user_id))],
            name=[HumanName(text=patient_model.full_name, given=given, family=family)],
            telecom=telecom,
            gender=patient_model.gender.lower() if patient_model.gender else "unknown",
            birthDate=patient_model.date_of_birth,
            address=[address]
        )

    async def get_practitioner(self, doctor_id: uuid.UUID) -> FHIRPractitioner:
        stmt = select(Doctor).where(Doctor.user_id == doctor_id)
        result = await self.db.execute(stmt)
        doctor_model = result.scalars().first()
        
        if not doctor_model:
            raise NotFoundException("Practitioner not found")

        name_parts = doctor_model.full_name.split(" ", 1)
        given = [name_parts[0]]
        family = name_parts[1] if len(name_parts) > 1 else None

        address = Address(
            text=doctor_model.clinic_address,
            city=doctor_model.city,
            state=doctor_model.state,
            country=doctor_model.country,
            postalCode=doctor_model.pincode
        )

        telecom = []
        if doctor_model.clinic_phone:
            telecom.append(ContactPoint(system="phone", value=doctor_model.clinic_phone, use="work"))
        if doctor_model.clinic_email:
            telecom.append(ContactPoint(system="email", value=doctor_model.clinic_email, use="work"))

        qualifications = []
        if doctor_model.specialization:
            qualifications.append({"code": {"text": doctor_model.specialization}})

        return FHIRPractitioner(
            id=str(doctor_model.id),
            identifier=[
                Identifier(system="medsync:doctor_id", value=str(doctor_model.user_id)),
                Identifier(system="license_number", value=doctor_model.license_number)
            ],
            name=[HumanName(text=doctor_model.full_name, given=given, family=family)],
            telecom=telecom,
            address=[address],
            qualification=qualifications
        )

    async def get_organization(self, org_id: uuid.UUID) -> FHIROrganization:
        # Check Hospital or Pharmacy
        stmt = select(Hospital).where(Hospital.id == org_id)
        result = await self.db.execute(stmt)
        hospital_model = result.scalars().first()
        
        if hospital_model:
            return FHIROrganization(
                id=str(hospital_model.id),
                name=hospital_model.name,
                address=[Address(text=hospital_model.address, city=hospital_model.city, state=hospital_model.state, postalCode=hospital_model.pincode)],
                telecom=[ContactPoint(system="phone", value=hospital_model.contact_number, use="work")]
            )
            
        stmt = select(Pharmacy).where(Pharmacy.user_id == org_id)
        result = await self.db.execute(stmt)
        pharmacy_model = result.scalars().first()
        if pharmacy_model:
            return FHIROrganization(
                id=str(pharmacy_model.id),
                identifier=[Identifier(system="license_number", value=pharmacy_model.license_number)],
                name=pharmacy_model.business_name,
                address=[Address(text=pharmacy_model.address)],
                telecom=[ContactPoint(system="phone", value=pharmacy_model.contact_number, use="work")]
            )

        raise NotFoundException("Organization not found")

    async def get_appointment(self, appointment_id: uuid.UUID) -> FHIRAppointment:
        stmt = select(Appointment).where(Appointment.id == appointment_id)
        result = await self.db.execute(stmt)
        appt_model = result.scalars().first()

        if not appt_model:
            raise NotFoundException("Appointment not found")

        if not await self._check_patient_access(appt_model.patient_id):
            if self.current_user.id != appt_model.doctor_id:
                raise ForbiddenException("Not authorized to access this appointment")

        participants = [
            {"actor": {"reference": f"Patient/{appt_model.patient_id}"}, "status": "accepted"},
            {"actor": {"reference": f"Practitioner/{appt_model.doctor_id}"}, "status": "accepted"}
        ]

        # Convert status
        status_map = {
            "PENDING": "pending",
            "CONFIRMED": "booked",
            "COMPLETED": "fulfilled",
            "CANCELLED": "cancelled",
            "NO_SHOW": "noshow",
            "RESCHEDULED": "pending"
        }
        fhir_status = status_map.get(appt_model.status, "pending")

        start = f"{appt_model.appointment_date}T{appt_model.start_time}" if appt_model.appointment_date and appt_model.start_time else None
        end = f"{appt_model.appointment_date}T{appt_model.end_time}" if appt_model.appointment_date and appt_model.end_time else None

        return FHIRAppointment(
            id=str(appt_model.id),
            status=fhir_status,
            description=appt_model.notes,
            start=start,
            end=end,
            participant=participants
        )

    async def get_medication(self, medicine_id: uuid.UUID) -> FHIRMedication:
        stmt = select(Medicine).where(Medicine.id == medicine_id)
        result = await self.db.execute(stmt)
        med_model = result.scalars().first()

        if not med_model:
            raise NotFoundException("Medication not found")

        return FHIRMedication(
            id=str(med_model.id),
            code=CodeableConcept(text=med_model.name),
            form=CodeableConcept(text=med_model.dosage_form) if med_model.dosage_form else None,
            ingredient=[{"itemCodeableConcept": {"text": med_model.generic_name}}] if med_model.generic_name else None
        )

    async def get_medication_request(self, prescription_id: uuid.UUID) -> FHIRMedicationRequest:
        stmt = select(Prescription).where(Prescription.id == prescription_id)
        result = await self.db.execute(stmt)
        rx = result.scalars().first()

        if not rx:
            raise NotFoundException("MedicationRequest not found")

        if not await self._check_patient_access(rx.patient_id):
            if self.current_user.id != rx.doctor_id:
                raise ForbiddenException("Not authorized")

        stmt_items = select(PrescriptionItem).where(PrescriptionItem.prescription_id == prescription_id)
        result_items = await self.db.execute(stmt_items)
        items = result_items.scalars().all()

        dosage_instructions = []
        for item in items:
            dosage_instructions.append({
                "text": f"{item.medicine_name} - {item.dosage} - {item.frequency} for {item.duration_days} days. {item.instructions or ''}"
            })

        status = "completed" if rx.is_dispensed else ("revoked" if rx.is_revoked else "active")

        return FHIRMedicationRequest(
            id=str(rx.id),
            status=status,
            intent="order",
            subject=Reference(reference=f"Patient/{rx.patient_id}"),
            requester=Reference(reference=f"Practitioner/{rx.doctor_id}"),
            encounter=Reference(reference=f"Appointment/{rx.appointment_id}") if rx.appointment_id else None,
            dosageInstruction=dosage_instructions,
            authoredOn=str(rx.created_at) if rx.created_at else None
        )

    async def get_medication_dispense(self, order_id: uuid.UUID) -> FHIRMedicationDispense:
        stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
        result = await self.db.execute(stmt)
        order = result.scalars().first()

        if not order:
            raise NotFoundException("MedicationDispense not found")

        if not await self._check_patient_access(order.patient_id):
            if self.current_user.id != order.pharmacy_id:
                raise ForbiddenException("Not authorized")

        status_map = {
            "PENDING": "preparation",
            "ACCEPTED": "preparation",
            "PACKED": "preparation",
            "OUT_FOR_DELIVERY": "in-progress",
            "DELIVERED": "completed",
            "CANCELLED": "cancelled",
            "RETURNED": "declined"
        }
        fhir_status = status_map.get(order.status, "unknown")

        return FHIRMedicationDispense(
            id=str(order.id),
            status=fhir_status,
            subject=Reference(reference=f"Patient/{order.patient_id}"),
            performer=[{"actor": Reference(reference=f"Organization/{order.pharmacy_id}")}],
            authorizingPrescription=[Reference(reference=f"MedicationRequest/{order.prescription_id}")] if order.prescription_id else None
        )

    async def get_document_reference(self, record_id: uuid.UUID) -> FHIRDocumentReference:
        stmt = select(MedicalRecord).where(MedicalRecord.id == record_id)
        result = await self.db.execute(stmt)
        record = result.scalars().first()

        if not record:
            raise NotFoundException("DocumentReference not found")

        if not await self._check_patient_access(record.patient_id):
            # Check permissions
            raise ForbiddenException("Not authorized")

        # In real-world, would pull from versions table
        status = "current" if not record.is_archived else "superseded"

        return FHIRDocumentReference(
            id=str(record.id),
            status=status,
            subject=Reference(reference=f"Patient/{record.patient_id}"),
            date=str(record.created_at),
            author=[Reference(reference=f"Practitioner/{record.uploaded_by}")] if record.uploaded_by != record.patient_id else [Reference(reference=f"Patient/{record.patient_id}")],
            description=record.title,
            content=[] # Content links should be securely generated if needed
        )

    async def get_patient_bundle(self, patient_id: uuid.UUID) -> FHIRBundle:
        if not await self._check_patient_access(patient_id):
            raise ForbiddenException("Not authorized")
            
        entries = []
        
        # Add Patient
        try:
            patient = await self.get_patient(patient_id)
            entries.append(BundleEntry(fullUrl=f"Patient/{patient_id}", resource=patient))
        except NotFoundException:
            pass
            
        # Add Appointments
        stmt = select(Appointment).where(Appointment.patient_id == patient_id)
        res = await self.db.execute(stmt)
        for appt in res.scalars().all():
            try:
                fhir_appt = await self.get_appointment(appt.id)
                entries.append(BundleEntry(fullUrl=f"Appointment/{appt.id}", resource=fhir_appt))
            except Exception:
                pass
                
        # Add MedicationRequests (Prescriptions)
        stmt = select(Prescription).where(Prescription.patient_id == patient_id)
        res = await self.db.execute(stmt)
        for rx in res.scalars().all():
            try:
                fhir_rx = await self.get_medication_request(rx.id)
                entries.append(BundleEntry(fullUrl=f"MedicationRequest/{rx.id}", resource=fhir_rx))
            except Exception:
                pass
                
        # Add DocumentReferences (Medical Records)
        stmt = select(MedicalRecord).where(MedicalRecord.patient_id == patient_id)
        res = await self.db.execute(stmt)
        for rec in res.scalars().all():
            try:
                fhir_doc = await self.get_document_reference(rec.id)
                entries.append(BundleEntry(fullUrl=f"DocumentReference/{rec.id}", resource=fhir_doc))
            except Exception:
                pass

        return FHIRBundle(id=str(uuid.uuid4()), entry=entries)
