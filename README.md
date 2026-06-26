# MedSync AI Microservice

A production-ready, highly scalable FastAPI microservice built to process medical imaging inferences (YOLO for object detection, EfficientNet for classification). This microservice operates completely independently from the main MedSync Web backend.

## 📁 Architecture
- **Framework**: FastAPI (Async)
- **ML Engine**: PyTorch, Ultralytics, Timm
- **Image Processing**: OpenCV (Headless), Pillow
- **Global Memory**: Models are loaded exactly once during the `lifespan` hook to prevent memory leaks and ensure blazing fast request latency.

## 🚀 Adding Your Models
By default, the `models/` directory contains empty placeholder files. The application will boot, but the `/health` endpoint will report that models are not loaded, and the `/predict` endpoint will return a 503 HTTP status code if requested.

To enable inference, copy your real trained weights into the `models/` folder:
1. `bone.pt` (YOLO)
2. `brain.pt` (YOLO)
3. `kidney.pt` (YOLO)
4. `skin.pth` (PyTorch EfficientNet state_dict)

## 🐳 Deployment (Docker / Hugging Face Spaces)

This repository is uniquely optimized for **Hugging Face Spaces**. 

1. Create a new **Docker Space** on Hugging Face.
2. Clone this repository directly into the Space.
3. Upload your `.pt` and `.pth` files into the `models/` directory via the Hugging Face UI or Git LFS.
4. Hugging Face will automatically detect the `Dockerfile`, install `libgl1` (for OpenCV), download dependencies, and spin up the server on port 8080.

## 💻 Local Testing

1. Create a virtual environment: `python -m venv venv`
2. Activate it: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `python app.py`

## 🔌 API Endpoints

### 1. `GET /health`
Returns memory usage and model loading status.
```json
{
  "status": "operational",
  "uptime_seconds": 12.5,
  "memory_usage_mb": 420.5,
  "loaded_models": {
    "bone": true,
    "brain": true,
    "kidney": false,
    "skin": true
  }
}
```

### 2. `POST /predict`
**Body**: `multipart/form-data`
- `scan_type` (text): "bone", "brain", "kidney", or "skin"
- `file` (file): The medical scan image.

Returns the standardized JSON:
```json
{
    "success": true,
    "scan_type": "brain",
    "processing_time": 0.61,
    "diagnosis": "Glioma",
    "confidence": 0.97,
    "boxes": [
        {
            "class": "Glioma",
            "confidence": 0.97,
            "coordinates": [12.5, 34.2, 100.5, 150.3]
        }
    ]
}
```
