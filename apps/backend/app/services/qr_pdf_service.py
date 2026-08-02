import uuid
import io
import qrcode
from datetime import datetime, timedelta, timezone
from jose import jwt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from app.core.config import settings

ALGORITHM = "HS256"

class QRPdfService:
    @staticmethod
    def generate_verification_token(prescription_id: uuid.UUID, doctor_id: uuid.UUID) -> str:
        """Generates a secure JWT token containing the prescription ID for QR embedding"""
        expire = datetime.now(timezone.utc) + timedelta(days=365)
        to_encode = {
            "exp": expire,
            "sub": str(prescription_id),
            "doc": str(doctor_id),
            "type": "rx_verify"
        }
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
        
    @staticmethod
    def generate_qr_code(token: str) -> io.BytesIO:
        """Generates a QR code image buffer from the token"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(token)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        return img_byte_arr

    @staticmethod
    def generate_prescription_pdf(
        prescription_data: dict, 
        patient_data: dict, 
        doctor_data: dict, 
        items: list, 
        qr_image_bytes: io.BytesIO,
        blockchain_tx: str = None
    ) -> io.BytesIO:
        """Generates the secure PDF for the prescription"""
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Header
        c.setFont("Helvetica-Bold", 20)
        c.drawString(50, height - 50, "MedSync Verified Prescription")
        
        # Blockchain Badge
        if blockchain_tx:
            c.setFont("Helvetica", 10)
            c.setFillColorRGB(0, 0.5, 0)
            c.drawString(width - 250, height - 50, "✓ Blockchain Verified")
            c.setFillColorRGB(0, 0, 0)
            c.setFont("Helvetica", 8)
            c.drawString(width - 250, height - 65, f"TX: {blockchain_tx[:20]}...")
            
        # Draw QR Code
        qr_image = ImageReader(qr_image_bytes)
        c.drawImage(qr_image, width - 150, height - 200, width=100, height=100)
        
        # Doctor Info
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 100, f"Dr. {doctor_data.get('name', 'N/A')}")
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 115, f"Reg: {doctor_data.get('medical_council_reg_number', 'N/A')}")
        c.drawString(50, height - 130, f"{doctor_data.get('clinic_name', 'MedSync Hospital')}")
        
        # Patient Info
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 170, f"Patient: {patient_data.get('name', 'N/A')}")
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 185, f"ID: {patient_data.get('id', 'N/A')}")
        
        # Prescription Details
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 230, "Prescribed Medicines:")
        
        y_position = height - 260
        c.setFont("Helvetica", 10)
        for item in items:
            med_string = f"- {item.get('medicine_name')}: {item.get('dosage')} | {item.get('frequency')} for {item.get('duration_days')} days"
            c.drawString(60, y_position, med_string)
            y_position -= 20
            if item.get('instructions'):
                c.drawString(80, y_position, f"Note: {item.get('instructions')}")
                y_position -= 20
                
        # Diagnosis
        if prescription_data.get("diagnosis"):
            y_position -= 20
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y_position, "Diagnosis:")
            y_position -= 20
            c.setFont("Helvetica", 10)
            c.drawString(60, y_position, prescription_data.get("diagnosis"))
            
        # Footer Note
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(50, 50, "This is a digitally generated and blockchain-verified prescription.")
        c.drawString(50, 40, "Scan the QR code via the MedSync Pharmacy app to verify authenticity.")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer
