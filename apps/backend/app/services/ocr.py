class OCRService:
    @staticmethod
    async def process_file(file_path: str):
        print(f"OCR: Processing file {file_path}")
        return {"extracted_text": "Mock extracted medical text", "confidence": 0.95}
