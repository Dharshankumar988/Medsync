# MedSync Portable Deployment Guide

This guide provides step-by-step instructions for deploying the MedSync Backend on any Windows/Linux/macOS laptop using Docker, and securely exposing it to the Vercel frontend via a Persistent Cloudflare Tunnel.

---

## A. One-time setup

### 1. Enable GitHub Container Registry (GHCR)
Ensure that your GitHub account is permitted to publish packages.
- Go to your repository settings -> **Actions** -> **General**.
- Ensure **Read and write permissions** are granted to the `GITHUB_TOKEN`.
- When you push to the `main` branch, the `.github/workflows/docker-publish.yml` workflow will automatically build and publish the Docker image.

### 2. Prepare External Services
You will need API keys and URLs for the following services:
- **Supabase**: `SUPABASE_URL`, `SUPABASE_KEY` (anon), and `DATABASE_URL` (for pgvector/Postgres).
- **Groq**: `GROQ_API_KEY` (MedSync uses `groq/compound` and `groq/compound-mini` exclusively).
- **Hugging Face Space #2**: `MEDSYNC_AI_URL` and `MEDSYNC_AI_TOKEN` (for the four diagnostic models).

### 3. Install Docker Desktop
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop).
- Open the application and ensure the Docker Engine is running.

### 4. Configure the Portable Runner
You do **not** need to download the entire MedSync source code. You only need the `portable_runner` folder.
- Download the `portable_runner.zip` package from your GitHub Releases.
- Extract it to a folder on your laptop.
- Open PowerShell in that folder and run: `Copy-Item .env.example .env`
- Open `.env` in any text editor and fill in your actual API keys. 

---

## B. Cloudflare Tunnel (Persistent Deployment)

To expose your local port 8000 securely to the internet (and Vercel), use a Cloudflare Named Tunnel. This requires a Cloudflare account and gives you a permanent domain (e.g., `api.yourdomain.com`).

1. Log into the Cloudflare Zero Trust Dashboard.
2. Go to **Networks** -> **Tunnels** -> **Create a tunnel**.
3. Name it (e.g. `medsync-backend`).
4. Copy the **token** string and paste it into your `.env` file as `CLOUDFLARE_TUNNEL_TOKEN`.
5. Route the public hostname (e.g., `api.yourdomain.com`) to the local service `http://localhost:8000`.
6. Add this same hostname as `MEDSYNC_API_HOSTNAME` in your `.env`.

---

## C. Starting MedSync

Once Docker is running, your `.env` is ready, and Cloudflare is configured:

1. Open PowerShell inside the `portable_runner` folder.
2. Run the start script:
   ```powershell
   .\start-medsync.ps1
   ```
3. The script will automatically:
   - Check if Docker is running.
   - Pull the latest image (`ghcr.io/dharshankumar988/medsync-backend:latest`).
   - Start the container on port `8000`.
   - Wait for the `/health` endpoint to return HTTP 200 OK.
   - Start the Cloudflare Tunnel locally if `start-cloudflare.ps1` exists.
   - Verify public connectivity.

4. Verify it's fully running by executing:
   ```powershell
   .\medsync-status.ps1
   ```

---

## D. Connecting Vercel

The Vercel frontend must be configured to point to your persistent Cloudflare Tunnel.

1. Tell your MedSync backend to accept requests from your Vercel domain.
2. Open your `.env` file and set the `CORS_ORIGINS` variable to your exact Vercel URL (with NO trailing slash).
   ```env
   CORS_ORIGINS=https://my-medsync-app.vercel.app
   ```
3. Restart the backend: `.\update-medsync.ps1`.
4. Go to your Vercel Project Settings -> Environment Variables.
5. Add or update `NEXT_PUBLIC_API_URL`.
6. Set the value to your tunnel URL + `/api/v1`.
   - Example: `https://api.yourdomain.com/api/v1`
7. **Redeploy** your Vercel application.

---

## E. Testing

Once everything is running, perform these checks:
1. **Health Check**: Open `https://api.yourdomain.com/health` in your browser. It should say `{"status": "ok"}`.
2. **Frontend Connection**: Open your Vercel app. Log in as a Patient. It should succeed.
3. **PULSE Role Isolation**: As a Patient, ensure you cannot access the diagnostic AI.
4. **Diagnostics**: Log in as a Doctor. Perform a diagnostic scan. The request securely travels from Vercel -> Cloudflare Tunnel -> Local Docker Backend -> HF Space #2, returning a structured clinical response.

---

## F. Updating the backend

When a new version of MedSync is pushed to GitHub, a new Docker image is published. To update your local laptop:
1. Open PowerShell in `portable_runner`.
2. Run:
   ```powershell
   .\update-medsync.ps1
   ```
This safely downloads the new image, restarts the container, and maintains all persistent settings.

---

## G. Stopping the backend

To turn off the backend:
1. Run:
   ```powershell
   .\stop-medsync.ps1
   ```
2. If running Cloudflare manually, run:
   ```powershell
   .\stop-cloudflare.ps1
   ```

---

## H. Security notes

- **NEVER** put API keys in Vercel environment variables unless they start with `NEXT_PUBLIC_`. 
- `GROQ_API_KEY`, `SUPABASE_KEY` (service role), and `MEDSYNC_AI_TOKEN` must **only** exist in the `.env` file on your laptop.
- Cloudflare Tunnel exposes port 8000 to the internet, but all endpoints remain protected by MedSync's JWT authentication and PULSE role-based access control.
- Do not commit your `.env` file or your Cloudflare Tunnel token.
