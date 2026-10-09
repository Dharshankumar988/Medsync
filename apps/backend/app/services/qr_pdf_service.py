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
        expire = datetime.now(timezone.utc) + timedelta(days=30)
        to_encode = {
            "exp": expire,
            "sub": str(prescription_id),
            "doc": str(doctor_id),
            "type": "rx_verify"
        }
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def generate_dynamic_token(resource_id: uuid.UUID, user_id: uuid.UUID, purpose: str, expires_in_minutes: int = 15) -> str:
        """Generates a short-lived purpose-scoped JWT token for dynamic QR authorization"""
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
        to_encode = {
            "exp": expire,
            "sub": str(resource_id),
            "user_id": str(user_id),
            "purpose": purpose,
            "type": "dynamic_qr"
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
        qr_token: str = None,
        blockchain_tx: str = None,
        pin: str = None
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
        if pin:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(width - 130, height - 215, f"PIN: {pin}")
            
        # Draw Doctor Profile Image (Top-Right)
        profile_img_url = doctor_data.get('profile_image_url')
        if profile_img_url:
            try:
                import urllib.request
                req = urllib.request.Request(profile_img_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    img_data = response.read()
                profile_image = ImageReader(io.BytesIO(img_data))
                c.drawImage(profile_image, width - 80, height - 100, width=50, height=50)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not load doctor profile image: {e}")
        
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

    @staticmethod
    def convert_to_pdf(raw_bytes: bytes, filename: str = "") -> bytes:
        """Converts any uploaded file (image, text, pdf) into a clean A4 PDF."""
        # 1. Check if it's already a valid PDF
        if raw_bytes.startswith(b"%PDF") or (filename and filename.lower().endswith(".pdf")):
            return raw_bytes

        # 2. Check if it's an image
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(raw_bytes))
            
            # Convert RGBA/P/LA/CMYK to RGB for clean PDF output
            if img.mode in ("RGBA", "P", "LA", "CMYK"):
                img = img.convert("RGB")
            
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="JPEG", quality=95)
            img_buffer.seek(0)
            
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=A4)
            width, height = A4
            
            # Page layout with margins
            margin = 35
            avail_w = width - (2 * margin)
            avail_h = height - (2 * margin) - 60 # Leave bottom room for verification badge
            
            img_w, img_h = img.size
            ratio = min(avail_w / max(img_w, 1), avail_h / max(img_h, 1), 1.0)
            draw_w = img_w * ratio
            draw_h = img_h * ratio
            
            draw_x = margin + (avail_w - draw_w) / 2
            draw_y = height - margin - draw_h
            
            c.drawImage(ImageReader(img_buffer), draw_x, draw_y, width=draw_w, height=draw_h)
            
            # Header
            c.setFont("Helvetica-Bold", 10)
            c.setFillColorRGB(0.25, 0.3, 0.38)
            display_title = filename or "Medical Record Attachment"
            c.drawString(margin, height - 22, display_title)
            
            c.save()
            packet.seek(0)
            return packet.read()
        except Exception:
            pass

        # 3. Fallback for text / documents
        try:
            text_content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text_content = raw_bytes.decode("latin-1")
            except Exception:
                text_content = f"Attached binary document: {filename} ({len(raw_bytes)} bytes)"

        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=A4)
        width, height = A4
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, height - 50, filename or "Medical Record Document")
        c.setFont("Helvetica", 9)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        
        y = height - 80
        for line in text_content.splitlines():
            if y < 80:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 9)
            c.drawString(40, y, line[:110])
            y -= 14
            
        c.save()
        packet.seek(0)
        return packet.read()

    @staticmethod
    def stamp_qr_on_pdf(original_pdf_bytes: bytes, qr_image_bytes: io.BytesIO, qr_token: str, title: str = None) -> bytes:
        try:
            import pypdf as pdf_module
        except ImportError:
            import PyPDF2 as pdf_module
        import io
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.utils import ImageReader
        
        # Create a new overlay PDF with ReportLab containing the bottom-right QR badge
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=A4)
        width, height = A4
        
        # Position card in the bottom-right corner
        card_w = 145
        card_h = 138
        card_x = width - card_w - 20
        card_y = 20
        
        # Card container with white fill and subtle border
        c.setFillColorRGB(1, 1, 1)
        c.setStrokeColorRGB(0.82, 0.86, 0.92)
        c.setLineWidth(1)
        c.roundRect(card_x, card_y, card_w, card_h, 6, fill=1, stroke=1)
        
        # Green Verified Pill Header
        c.setFillColorRGB(0.04, 0.58, 0.35)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(card_x + 10, card_y + card_h - 14, "✓ Blockchain Verified")
        
        # Center QR code inside the card
        qr_size = 85
        qr_x = card_x + (card_w - qr_size) / 2
        qr_y = card_y + 28
        qr_image = ImageReader(qr_image_bytes)
        c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)
        
        # Network & Token footer
        c.setFillColorRGB(0.2, 0.25, 0.35)
        c.setFont("Helvetica", 6.5)
        short_id = qr_token if len(qr_token) <= 18 else f"{qr_token[:10]}...{qr_token[-6:]}"
        c.drawString(card_x + 8, card_y + 16, f"ID: {short_id}")
        
        c.setFillColorRGB(0.45, 0.5, 0.58)
        c.setFont("Helvetica", 6)
        c.drawString(card_x + 8, card_y + 7, "Polygon Amoy Ledger")
        
        c.save()
        packet.seek(0)
        
        # Merge the stamped QR PDF with the original
        new_pdf = pdf_module.PdfReader(packet)
        existing_pdf = pdf_module.PdfReader(io.BytesIO(original_pdf_bytes))
        output = pdf_module.PdfWriter()
        
        total_pages = len(existing_pdf.pages)
        for i in range(total_pages):
            page = existing_pdf.pages[i]
            # Stamp the first page (or last page)
            if i == 0:
                page.merge_page(new_pdf.pages[0])
            output.add_page(page)
            
        output_stream = io.BytesIO()
        output.write(output_stream)
        output_stream.seek(0)
        return output_stream.read()

    @staticmethod
    def encrypt_pdf(pdf_bytes: bytes, user_pin: str) -> bytes:
        """Encrypts PDF using the user's PIN as password"""
        try:
            import pypdf as pdf_module
        except ImportError:
            import PyPDF2 as pdf_module
        import io
        reader = pdf_module.PdfReader(io.BytesIO(pdf_bytes))
        writer = pdf_module.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.encrypt(user_password=user_pin, owner_password=user_pin)
        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_stream.seek(0)
        return output_stream.read()

