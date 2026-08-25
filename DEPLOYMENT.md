# MedSync Full Production Deployment Guide

This guide describes the exact steps and correct sequence to successfully deploy MedSync's architecture:
`Vercel → HF Space #1 (FastAPI/PULSE) → Supabase + Groq + HF Space #2 (Diagnostics)`.

**WARNING**: Do NOT deviate from this order. Do NOT deploy Vercel before the backend is fully running.

---

## 1. Initial Setup (GitHub)
1. Push all your latest changes to the `main` branch.
2. Ensure you have accounts created at: [Supabase](https://supabase.com/), [Groq](https://console.groq.com/), [Hugging Face](https://huggingface.co/), and [Vercel](https://vercel.com/).

---

## 2. Supabase Configuration
1. Create a new Supabase project.
2. Under **Project Settings > API**, copy the `Project URL` and `anon public` key. 
3. Under **Project Settings > Database**, copy the `Connection string` (URI).
4. Run the contents of `database_setup.sql` in the Supabase SQL Editor.
   *Ensure you DO NOT run `dummy_values.sql` in production.*
5. Note these variables for later:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `DATABASE_URL`

---

## 3. Groq LLM Configuration
1. Navigate to the [Groq API Console](https://console.groq.com/keys) and generate an API key.
2. Ensure you have access to `groq/compound` and `groq/compound-mini`.
3. Note this variable for later:
   - `GROQ_API_KEY`

---

## 4. Deploy HF Space #2 (Diagnostic AI)
1. In Hugging Face, create a new Space (Docker template).
2. Upload the Diagnostic AI codebase to this space.
3. Once deployed and running successfully, copy the Space URL (e.g., `https://username-diagnostic-ai.hf.space`).
4. Generate an access token from your Hugging Face Settings (Access Tokens) with `read` permissions.
5. Note these variables for later:
   - `MEDSYNC_AI_URL` (the Space #2 URL)
   - `MEDSYNC_AI_TOKEN` (the HF access token)

---

## 5. Test Space #2
*Before proceeding, verify Space #2 works.*
```bash
curl -X GET <MEDSYNC_AI_URL>/api/v1/health \
  -H "Authorization: Bearer <MEDSYNC_AI_TOKEN>"
```
- **Expected Result**: HTTP 200 OK
- **Common Failure**: HTTP 401 Unauthorized (Check token), or HTTP 503 (Space is asleep).

---

## 6. Deploy HF Space #1 (FastAPI/PULSE)
1. In Hugging Face, create another new Space, select **Docker** as the environment.
2. Link it to your GitHub repository or upload the `apps/backend` directory.
3. Go to **Settings > Variables and secrets** in Space #1 and add the following **Secrets**:
   - `SUPABASE_URL`: (From Step 2)
   - `SUPABASE_KEY`: (From Step 2)
   - `DATABASE_URL`: (From Step 2)
   - `JWT_SECRET_KEY`: (Generate a secure random string)
   - `BIOMETRIC_ENCRYPTION_KEY`: (Generate a secure random 32-byte base64 string)
   - `GROQ_API_KEY`: (From Step 3)
   - `GROQ_MODEL`: `groq/compound`
   - `GROQ_FALLBACK_MODEL`: `groq/compound-mini`
   - `MEDSYNC_AI_URL`: (From Step 4)
   - `MEDSYNC_AI_TOKEN`: (From Step 4)
   - `CORS_ORIGINS`: `*` (Temporarily allow all until Vercel is deployed)

---

## 7. Test Space #1 /health
Wait for the Space #1 build to complete.
```bash
curl -X GET https://<SPACE-1-ID>.hf.space/health
```
- **Expected Result**: `{"status": "ok", "version": "1.0.0"}`
- **Common Failure**: HTTP 500 (Check Space logs for missing environment variables).

---

## 8. Test Complete PULSE Backend
Test the authentication flow and AI endpoints using the interactive Swagger UI at:
`https://<SPACE-1-ID>.hf.space/docs`
Verify that `POST /api/v1/pulse/chat` returns a successful Groq response using a test patient token.

---

## 9. Deploy Vercel (Frontend)
1. Import `apps/web` into a new Vercel project.
2. In the Vercel **Environment Variables** configuration, add ONLY the following:
   - `NEXT_PUBLIC_API_URL`: `https://<SPACE-1-ID>.hf.space/api/v1`
3. Click **Deploy**.
4. Once deployed, copy your final Vercel domain (e.g., `https://medsync-frontend.vercel.app`).

---

## 10. Update CORS_ORIGINS
1. Return to Hugging Face **Space #1 Settings**.
2. Update the `CORS_ORIGINS` secret to your exact Vercel domain:
   - `CORS_ORIGINS`: `https://medsync-frontend.vercel.app`
3. Restart Space #1.

---

## 11. Test Vercel → Space #1
Navigate to your Vercel URL in your browser. Attempt to log in or create an account.
- **Expected Result**: Seamless login and dashboard load.
- **Common Failure**: CORS Error in browser console.
- **Fix**: Verify `CORS_ORIGINS` exactly matches the Vercel domain (no trailing slash).

---

## 12. Execute Complete Role Matrix Verification
Log into the production Vercel app using 4 different accounts to verify the security models:
1. **Patient**: Verify AI chat works, try to access diagnostics (should fail).
2. **Doctor**: Verify AI chat works, try to analyze an image (should succeed).
3. **Pharmacy**: Verify AI chat works, query medicine inventory (should succeed).
4. **Admin**: Verify AI chat works, try to access diagnostics (should fail).

If all tests pass, the system is fully deployed.
