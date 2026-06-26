# Deployment Guide

*This guide complements the `infrastructure/docs/deployment.md` file.*

## 1. Environment Preparation
Before deploying, ensure you have production values for:
- `DATABASE_URL` (e.g., Supabase PostgreSQL connection string)
- `JWT_SECRET_KEY` (Generate via `openssl rand -hex 32`)
- `GROQ_API_KEY` (From Groq Console)
- `POLYGON_RPC_URL` & `PRIVATE_KEY` (Wallet funded with Amoy MATIC)

## 2. Supabase (Database & Storage)
1. Create a new project in Supabase.
2. Run the SQL migrations found in `apps/backend/alembic/versions`.
3. Create a public Storage Bucket named `medical-records` if bypassing IPFS for backups.

## 3. Polygon Amoy (Blockchain)
1. Navigate to `apps/blockchain`.
2. Run `npm run deploy:amoy`.
3. Save the returned contract addresses to your Backend `.env`.

## 4. Render (Backend)
1. Connect your GitHub repository to Render as a "Web Service".
2. Set the Root Directory to `apps/backend`.
3. Build Command: `pip install -r requirements.txt && alembic upgrade head`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 5. Vercel (Frontend Web)
1. Connect to Vercel.
2. Set Root Directory to `apps/web`.
3. Set `NEXT_PUBLIC_API_URL` to your Render deployment URL.
4. Deploy.

## 6. Expo (Mobile)
Run `eas build --profile production --platform android` (or `ios`) to generate the APK/AAB or IPA.
