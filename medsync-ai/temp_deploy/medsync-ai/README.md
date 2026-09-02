---
title: MedSync AI Microservice
emoji: 🏥
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# MedSync AI Inference Microservice

This repository powers the computer vision backend for the MedSync Healthcare Ecosystem. 
It provides high-performance inference for medical imaging using YOLO and EfficientNet architectures.

## Deployment on Hugging Face Spaces

This project is configured as a **Docker Space**.

### Required Environment Variables

When deploying to Hugging Face Spaces, set the following secrets/variables in the Space settings:

- `HF_TOKEN`: Your Hugging Face read token (Required if downloading weights from a private repo)
- `AI_SERVICE_TOKEN`: A secure token to protect the endpoints (e.g., `your_secure_random_string`)
- `HF_MODEL_REPO_ID`: The HF Hub repo containing your weights (e.g., `Dharshankumar988/medsync-ai-weights`)

### Cold Start Optimization

Models are **lazy-loaded** onto the GPU/CPU. When the Space boots, it initializes instantly, allowing health checks to pass. The specific model (Bone, Brain, Kidney, Skin) is only loaded into memory when an inference request is received for that type.

### Automatic Model Weights Download

If the local `models/` directory does not contain the required `.pt` files (or if they are 0 bytes), the microservice will automatically attempt to securely download them from your designated Hugging Face Model Repository (`HF_MODEL_REPO_ID`) using `HF_TOKEN`.
