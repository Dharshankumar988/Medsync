# MedSync Portable Deployment Guide

This guide provides step-by-step instructions for deploying the MedSync Backend on any Windows/Linux/macOS laptop using Docker, and securely exposing it to the Vercel frontend via Cloudflare Tunnel.

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
- Open the application and ensure the Docker Engine is running (the icon in your system tray should indicate it is running).

### 4. Configure the Portable Runner
You do **not** need to download the entire MedSync source code. You only need the `portable_runner` folder.
- Open the `portable_runner` folder on your laptop.
- Copy `medsync.env.example` and rename it to `medsync.env`.
- Open `medsync.env` in any text editor (like Notepad) and fill in your actual API keys. 
- *Note: Do not put quotes around the values unless they contain spaces.*

---

## B. Starting MedSync

Once Docker is running and your `medsync.env` file is ready:

1. Open PowerShell or Command Prompt inside the `portable_runner` folder.
2. Run the start script:
   ```cmd
   .\start-medsync.bat
   ```
   *(On Mac/Linux, run `./start-medsync.sh`)*

3. The script will automatically:
   - Check if Docker is running.
   - Pull the latest `ghcr.io/dharshankumar988/medsync-backend:latest` image.
   - Start the container on port `8000`.
   - Wait until the `/health` endpoint returns an HTTP 200 OK.

4. Verify it's running by executing:
   ```cmd
   .\medsync-status.bat
   ```
   This will show you the container status, port, health check result, and recent logs.

---

## C. Connecting Vercel

If you are running the frontend locally (e.g. `npm run dev` on `http://localhost:3000`), you don't need a tunnel.
However, if your frontend is deployed on **Vercel**, it cannot access `http://localhost:8000` on your laptop directly. You must use a Cloudflare Tunnel.

1. First, tell your MedSync backend to accept requests from your Vercel domain.
2. Open your `medsync.env` file.
3. Set the `CORS_ORIGINS` variable to your exact Vercel URL (with NO trailing slash).
   ```env
   CORS_ORIGINS=https://my-medsync-app.vercel.app
   ```
4. Restart the backend to apply the change: `.\update-medsync.bat`.

---

## D. Cloudflare Tunnel

To expose your local port 8000 securely to the internet (and Vercel), use Cloudflare Tunnel.

### Option 1: Temporary Quick Tunnel (For testing)
This requires no Cloudflare account but the URL changes every time it restarts.
1. Download `cloudflared` from Cloudflare's website.
2. Run:
   ```cmd
   cloudflared tunnel --url http://localhost:8000
   ```
3. Look for the output line containing `https://<random>.trycloudflare.com`.

### Option 2: Persistent Named Tunnel (Recommended for Production)
This requires a Cloudflare account and gives you a permanent domain (e.g., `api.yourdomain.com`).
1. Log into the Cloudflare Zero Trust Dashboard.
2. Go to **Networks** -> **Tunnels** -> **Create a tunnel**.
3. Install the connector on your laptop using the provided command.
4. Route the public hostname (e.g., `api.yourdomain.com`) to the local service `http://localhost:8000`.

### Tell Vercel about the Tunnel
1. Go to your Vercel Project Settings -> Environment Variables.
2. Add or update `NEXT_PUBLIC_API_URL`.
3. Set the value to your tunnel URL + `/api/v1`.
   - Example: `https://api.yourdomain.com/api/v1`
4. **Redeploy** your Vercel application for the environment variable to take effect.

---

## E. Testing

Once everything is running, perform these checks:
1. **Health Check**: Open `http://localhost:8000/health` in your browser. It should say `{"status": "ok"}`.
2. **Frontend Connection**: Open your Vercel app. Log in as a Patient. It should succeed.
3. **PULSE Role Isolation**: As a Patient, ensure you cannot access the diagnostic AI.
4. **Diagnostics**: Log in as a Doctor. Perform a diagnostic scan. The request should securely travel from Vercel -> Cloudflare Tunnel -> Local Docker Backend -> HF Space #2, returning a structured clinical response.

---

## F. Updating the backend

When a new version of MedSync is pushed to GitHub, a new Docker image is published. To update your local laptop:
1. Open terminal in `portable_runner`.
2. Run:
   ```cmd
   .\update-medsync.bat
   ```
This will safely download the new image, stop the old container, start the new one using your existing `medsync.env`, and verify health. Persistent data stored in Supabase remains untouched.

---

## G. Stopping the backend

To turn off the backend (e.g., when you shut down your laptop):
1. Stop the Cloudflare tunnel (press `Ctrl+C` in the terminal where it's running).
2. Open terminal in `portable_runner`.
3. Run:
   ```cmd
   .\stop-medsync.bat
   ```
This stops the Docker container cleanly without deleting any data.

---

## H. Troubleshooting

- **"Docker daemon is not running"**: Open the Docker Desktop application.
- **Port 8000 is in use**: Edit `start-medsync.bat` and change `PORT=8000` to `PORT=8080`.
- **CORS Error in Browser**: Ensure `CORS_ORIGINS` in `medsync.env` matches your exact Vercel URL, and that you restarted the backend.
- **Vercel API is offline**: Ensure the `cloudflared` tunnel is running on your laptop. If it disconnected, restart it. If you used a quick tunnel, your URL changed, so you must update Vercel's `NEXT_PUBLIC_API_URL` and redeploy.
- **Diagnostics Fail**: Ensure `MEDSYNC_AI_URL` and `MEDSYNC_AI_TOKEN` are correct, and wake up your HF Space if it paused due to inactivity.

---

## I. Security notes

- **NEVER** put API keys in Vercel environment variables unless they start with `NEXT_PUBLIC_`. 
- `GROQ_API_KEY`, `SUPABASE_KEY` (service role), and `MEDSYNC_AI_TOKEN` must **only** exist in the `medsync.env` file on your laptop.
- Vercel only needs `NEXT_PUBLIC_API_URL`.
- The MedSync backend uses Groq (`groq/compound`) exclusively. There is no OpenAI fallback.
- The browser never communicates directly with HF Space #2. All diagnostic requests are routed securely through the local backend.
- Cloudflare Tunnel exposes port 8000 to the internet, but all endpoints remain protected by MedSync's JWT authentication and PULSE role-based access control.
