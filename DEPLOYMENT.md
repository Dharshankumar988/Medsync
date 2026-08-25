# MedSync Production Deployment Guide

This guide covers deploying MedSync to production using Render (Backend) and Vercel (Frontend), while preserving the existing diagnostic models hosted on HF Space #2.

## Deployment Architecture

```text
Vercel (Frontend)
   ↓ HTTPS
Render (Backend: FastAPI + PULSE + Auth + RAG + Groq + Face Auth)
   ↓ Authenticated Server-to-Server HTTPS
HF Space #2 (Diagnostic Inference)
```

---

## 1. Environment Variables Overview

You will need to configure variables in two distinct places:

### Render Environment Variables (Backend)
These variables must be set securely in the Render dashboard and **NEVER** exposed to the browser.

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | Your Supabase service role key (or anon key depending on backend DB config) | `eyJhb...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `JWT_SECRET_KEY` | Secret for encoding auth tokens | `your-secure-random-string` |
| `BIOMETRIC_ENCRYPTION_KEY`| Key for encrypting face templates | `your-32-byte-hex-string` |
| `GROQ_API_KEY` | Your Groq API key | `gsk_...` |
| `GROQ_MODEL` | Primary PULSE orchestration model | `groq/compound` |
| `GROQ_FALLBACK_MODEL` | Fallback model if primary fails | `groq/compound-mini` |
| `MEDSYNC_AI_URL` | The HF Space #2 URL | `https://your-space.hf.space` |
| `MEDSYNC_AI_TOKEN` | Bearer token for HF Space #2 | `hf_...` |
| `CORS_ORIGINS` | Permitted frontend origins | `https://medsync-app.vercel.app` |

### Vercel Environment Variables (Frontend)
These variables are safe for the browser.

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `NEXT_PUBLIC_API_URL` | The URL of your Render backend | `https://medsync-api.onrender.com/api/v1` |

---

## 2. Render Deployment Steps (Backend)

1. **Log in to Render:** Go to [render.com](https://render.com) and log in.
2. **Create New Web Service:** Click **New +** and select **Web Service**.
3. **Connect Repository:** Connect your GitHub account and select the MedSync repository.
4. **Configuration Details:**
   - **Name:** `medsync-backend` (or your choice)
   - **Root Directory:** `apps/backend` (Crucial! Do not leave blank)
   - **Runtime:** `Docker`
   - **Instance Type:** Select **Standard** or higher (at least 2GB RAM is recommended because Face Auth loads DeepFace/TensorFlow into memory).
5. **Environment Variables:**
   - Scroll down to the Environment Variables section.
   - Click "Add Environment Variable" and copy each variable from the Render table above.
   - For `CORS_ORIGINS`, you can temporarily set it to `*` until Vercel is deployed, but be sure to update it to your exact Vercel URL (e.g., `https://my-medsync.vercel.app`) afterward.
6. **Deploy:** Click **Create Web Service**.
7. **Verify Health:** Once the build finishes and the service is "Live", copy the Render URL (e.g., `https://medsync-xyz.onrender.com`).
   - Open your browser to `https://medsync-xyz.onrender.com/health` and verify you receive `{"status":"ok","version":"1.0.0"}`.

---

## 3. Vercel Deployment Steps (Frontend)

1. **Log in to Vercel:** Go to [vercel.com](https://vercel.com) and log in.
2. **Add New Project:** Click **Add New... -> Project**.
3. **Import Repository:** Select the MedSync GitHub repository.
4. **Configuration Details:**
   - **Framework Preset:** Next.js
   - **Root Directory:** Edit this and select `apps/web`.
5. **Environment Variables:**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://<your-render-url>.onrender.com/api/v1` (replace with the URL from Render Step 7)
6. **Deploy:** Click **Deploy**.
7. **Copy URL:** Once deployed, copy your production domain (e.g., `https://medsync.vercel.app`).
8. **Update Render CORS (Important):** Go back to your Render dashboard, edit the `CORS_ORIGINS` variable to match your Vercel URL exactly, and wait for Render to redeploy.

---

## 4. End-to-End Testing Procedure

Do not consider the application production-ready until you complete these manual tests:

1. **Patient Registration & Auth:**
   - Visit the Vercel URL.
   - Register a new Patient.
   - Verify Face Authentication captures the image and successfully registers.
2. **PULSE Role Isolation:**
   - **Patient:** Attempt to ask a general medical question. Verify Groq answers via RAG.
   - **Pharmacy:** Attempt to ask an inventory question. Verify Groq answers. Attempt to ask for a diagnostic evaluation and ensure it is blocked or gracefully handled without calling HF Space #2.
3. **Doctor Diagnostic Flow:**
   - Log in as a Doctor.
   - Upload a test image (e.g., a skin lesion image) and select the "skin" scan type.
   - Verify the request succeeds.
   - Confirm the response contains a structured interpretation (diagnosis, confidence) that matches the raw output of HF Space #2, along with Groq's clinical explanation.
4. **Resilience Check:**
   - Modify the `MEDSYNC_AI_TOKEN` in Render to an invalid value, wait for restart, and attempt a diagnostic scan.
   - Verify the backend returns a structured `DIAGNOSTIC_SERVICE_UNAVAILABLE` or similar authorization error, rather than crashing.
