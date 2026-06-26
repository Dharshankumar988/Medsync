# MedSync Deployment Guide

## 1. Database (Supabase)
1. Create a new Supabase project.
2. Go to SQL Editor and run all generated Alembic migration scripts from `apps/backend/alembic/versions`.
3. Copy the Connection String (PostgreSQL) and Anon Key to your Backend `.env`.

## 2. Backend (Render)
1. Create a new "Web Service" on Render.
2. Connect your GitHub repository.
3. Root Directory: `apps/backend`
4. Environment: `Python 3`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
7. Add all variables from `.env.example`.

## 3. Frontend (Vercel)
1. Import repository to Vercel.
2. Framework Preset: Next.js
3. Root Directory: `apps/web`
4. Set `NEXT_PUBLIC_API_URL` to your Render backend URL.
5. Deploy.

## 4. Blockchain (Polygon Amoy)
1. `cd apps/blockchain`
2. Configure `.env` with `POLYGON_AMOY_RPC_URL` and `PRIVATE_KEY`.
3. Run `npm run deploy:amoy`.
4. Update the Backend `.env` with the deployed contract addresses.
