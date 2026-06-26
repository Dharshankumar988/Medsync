# AI & Machine Learning Architecture

MedSync features two distinct AI modules tailored to different user roles, balancing intensive local computer vision tasks with lightning-fast cloud LLM inference.

## 1. Doctor AI (Computer Vision)
Designed exclusively to assist verified doctors in diagnosing medical imagery (X-Rays, MRIs, CT Scans).

### Pipeline:
1. **Upload**: Doctor uploads a DICOM or high-res image via the frontend.
2. **Preprocessing**: The FastAPI `ModelManager` resizes and normalizes the tensor.
3. **Inference (YOLO/EfficientNet)**: 
   - YOLO detects specific anomalies (e.g., tumors, fractures) and returns bounding boxes.
   - EfficientNet classifies the overall scan (e.g., Pneumonia vs. Normal).
4. **Metadata Extraction**: OCR (Tesseract) strips embedded text (patient names, dates) for secure indexing.
5. **Result**: The UI overlays bounding boxes on the image and presents a differential diagnosis. *Note: MedSync explicitly flags these as "Assistant Suggestions" and not definitive medical diagnoses.*

## 2. Patient AI (Groq RAG LLM)
Designed to help patients understand their own medical records, lab results, and prescriptions.

### Pipeline:
1. **Context Retrieval (RAG)**: When a patient asks a question, the backend queries the Postgres database for their most recent Medical Records and Prescriptions.
2. **Prompt Injection**: The medical context is securely injected into a strict system prompt.
3. **Inference (Groq)**: The request is sent to Groq's API (utilizing models like Llama 3) for near-instantaneous inference.
4. **Response**: The patient receives an empathetic, easy-to-understand explanation of their medical data.
