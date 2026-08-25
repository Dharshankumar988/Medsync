# MedSync

MedSync is a comprehensive, AI-powered healthcare management platform designed to securely handle patient records, streamline hospital operations, and provide advanced medical image diagnostics using local and remote AI microservices.

## Features
- **Secure Medical Records**: End-to-end security for patient data management.
- **Role-Based Access Control**: Isolated dashboards and permissions for Patients, Doctors, Pharmacies, and Admins.
- **Diagnostic AI**: Integrated support for analyzing medical imaging (Bone Fractures, Brain Tumors, Kidney Stones, Skin Conditions).
- **PULSE AI Assistant**: Intelligent RAG-based search and clinical reasoning powered by Groq.
- **Portable Deployment**: Run the entire backend stack locally on any Windows machine with zero configuration.

## Architecture
Vercel Frontend → Tailscale Funnel → Local MedSync Backend (Docker) → Supabase + AI Services

## AI Capabilities
MedSync leverages a hybrid AI architecture:
- **Local AI**: DeepFace (for Face Authentication) and SentenceTransformers (for RAG embeddings) run directly within the backend container.
- **Remote Diagnostics**: Heavy medical imaging models (YOLO/EfficientNet) are offloaded to an external Hugging Face AI Microservice to ensure the core backend remains fast and lightweight.

## Deployment

### Portable Windows Deployment
The easiest way to run MedSync is using our standalone portable runner for Windows. It requires no Git knowledge and automatically sets up Docker and Cloudflare.

→ **[See implementation.md](implementation.md) for the complete installation guide.**

## Development
To contribute to MedSync, clone the repository and navigate to the respective application directories (`apps/backend` or `apps/blockchain`). See the internal documentation within those folders for local development setups.

## Security
- **Never commit `.env` files** or hardcode API keys.
- All secrets are managed locally or via secure vault systems.
- Patient data is strictly authorized via JWT and Row Level Security (RLS) policies.

## Support
If you encounter issues, please open a GitHub Issue in this repository providing your environment details and error logs.

---

© 2026 Dharshankumar988. All rights reserved.

Unauthorized copying, redistribution, or commercial use of this project or its deployment materials is not permitted unless explicitly authorized by the copyright holder.
