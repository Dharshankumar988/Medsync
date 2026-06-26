# Production Readiness Checklist

## Security
- [ ] Ensure all `.env` files are in `.gitignore`.
- [ ] Change `JWT_SECRET_KEY` to a 64-character randomized hex.
- [ ] Verify Supabase RLS (Row Level Security) is enabled on all tables (if direct client access is ever used, though MedSync relies on backend proxy).
- [ ] Restrict CORS in `apps/backend/app/main.py` to only allow the Vercel frontend URL.

## Performance
- [ ] Next.js images configured with optimized domains in `next.config.ts`.
- [ ] Uvicorn workers scaled to `4` (or based on CPU cores) in Dockerfile.
- [ ] IPFS Gateway caches enabled (Pinata Dedicated Gateway).

## Blockchain
- [ ] Ensure the Server Wallet has enough Amoy MATIC for gas fees.
- [ ] Ensure `BACKEND_ROLE` is successfully granted to the Server Wallet address on all deployed contracts.

## AI
- [ ] Verify Groq rate limits for the production API key.
- [ ] Ensure placeholder OCR and Vision pipelines gracefully degrade if mock data is used.
