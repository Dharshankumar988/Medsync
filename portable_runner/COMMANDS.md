# MedSync Portable Runner — Command Guide & Cheat Sheet

Run MedSync easily on Windows without cloning the entire repository.

---

## ⚡ Quick Command Cheat Sheet (Windows PowerShell)

| Action | Command |
|---|---|
| **Start MedSync (Interactive + Ngrok)** | `.\start-medsync.bat` *(or `powershell -ExecutionPolicy Bypass -File .\start-medsync.ps1`)* |
| **Stop MedSync & Clean Docker** | Press **`Ctrl+C`** in runner window *(or run `.\stop-medsync.bat`)* |
| **Check Health & Status** | `.\medsync-status.bat` *(or `powershell -ExecutionPolicy Bypass -File .\medsync-status.ps1`)* |
| **Stream Live Backend Logs** | `docker logs -f medsync-backend` |
| **Force Remove Container** | `docker rm -f medsync-backend` |
| **Start Tunnel Only** | `.\start-ngrok.bat` *(or `powershell -ExecutionPolicy Bypass -File .\start-ngrok.ps1`)* |
| **Update Runner & Pull Image** | `.\update-medsync.bat` |
| **Edit Secrets / Config** | `notepad .env` |

---

## 🚀 How to Start MedSync

### 1. Interactive Desktop Runner (Default)
In your `portable_runner` folder:
```powershell
.\start-medsync.bat
```
- Displays an **interactive visual loading bar** showing progress (DB migrations, schema verification, and startup).
- Automatically connects your Ngrok tunnel when ready.
- **Pressing `Ctrl+C` automatically stops and cleans up the Docker container and Ngrok tunnel.**

### 2. Stream Logs Directly
```powershell
powershell -ExecutionPolicy Bypass -File .\start-medsync.ps1 -FollowLogs
```

### 3. Background / Headless Daemon Mode
If running on a server or wanting it to remain running after closing the window:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-medsync.ps1 -Remote -Daemon
```

### 4. Custom Port
```powershell
powershell -ExecutionPolicy Bypass -File .\start-medsync.ps1 -Port 8080
```

---

## 🛑 How to Stop MedSync Cleanly

You have three easy ways to stop the backend:

1. **Inside the Runner window:**
   Simply press **`Ctrl + C`**. 
   The runner will intercept the break signal, safely stop the `medsync-backend` container, remove it from Docker, and terminate the ngrok process.

2. **From another PowerShell window:**
   ```powershell
   cd YOUR_INSTALLATION_PATH\portable_runner
   .\stop-medsync.bat
   ```

3. **Direct Docker Command:**
   ```powershell
   docker rm -f medsync-backend
   ```

---

## 🌐 Ngrok Tunnel & Static Domain Setup

If your frontend is hosted on Vercel or you need an HTTPS endpoint for mobile apps:

1. Sign up for free at [ngrok.com](https://ngrok.com).
2. Claim your 1 free static domain (e.g. `entangled-dealmaker-storable.ngrok-free.dev`).
3. In `portable_runner\.env`, set:
   ```env
   BACKEND_NGROK_AUTHTOKEN=your_ngrok_token_here
   BACKEND_NGROK_URL=entangled-dealmaker-storable.ngrok-free.dev
   ```
4. Start the runner (`.\start-medsync.bat`). It will automatically start ngrok and print your active URL.

---

## 🔍 Troubleshooting

| Issue | Cause & Solution |
|---|---|
| **`ERR_NGROK_3200` (Offline)** | The runner has not finished starting up, or ngrok crashed. Wait for the runner to finish its health check and print `MEDSYNC FULL BACKEND READY`. Check `portable_runner\ngrok.log` for details. |
| **Docker not running error** | Start **Docker Desktop** from your Start menu. Wait until the whale icon turns green ("Engine running"). |
| **`unexpected EOF` during pull** | Low disk space on drive `C:`, or WSL2 engine ran out of memory. Free up at least 15 GB and retry. |
| **Port 8000 already in use** | An old container is still running. Run `docker rm -f medsync-backend` or `.\stop-medsync.bat`. |
