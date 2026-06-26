class OCRService:
    @staticmethod
    async def extract_text(file_bytes: bytes):
        print("OCR: Processing document...")
        return {
            "patient_name": "John Doe",
            "doctor_name": "Dr. Smith",
            "extracted_text": "Amoxicillin 500mg, 1x day for 7 days."
        }
