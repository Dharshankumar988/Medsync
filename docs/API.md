# API Reference

Base URL: `http://localhost:8000/api/v1`

## Authentication

### `POST /auth/login`
Authenticates a user and returns a JWT.
- **Request (FormData)**: `username` (email), `password`
- **Response**: `{ "access_token": "ey...", "token_type": "bearer" }`

### `POST /auth/register`
Registers a new user in the system.
- **Request (JSON)**: `email`, `password`, `role`
- **Response**: User object without password.

## Medical Records

### `POST /records/`
Uploads a new medical record.
- **Headers**: `Authorization: Bearer <token>`
- **Request (Multipart Form)**: `file`
- **Response**: Metadata including IPFS CID and Blockchain Transaction Hash.

### `GET /records/{patient_id}`
Retrieves all records for a specific patient.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of record metadata.

## AI Endpoints

### `POST /ai/doctor/analyze-scan`
Analyzes an uploaded X-ray or MRI using YOLO/EfficientNet.
- **Headers**: `Authorization: Bearer <token>` (Must be a Doctor)
- **Request**: Image File
- **Response**: Bounding boxes, confidence scores, and differential diagnoses.

### `POST /ai/patient/chat`
RAG-powered conversational interface for patients (via Groq).
- **Request (JSON)**: `{"prompt": "What does my latest blood test mean?"}`
- **Response**: Markdown-formatted text response.

*(Full Swagger UI documentation is available at `http://localhost:8000/docs` when the backend is running).*
