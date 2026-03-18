# Frontend Guide

## Canonical frontend
Only `frontend/` is active. The React + Vite app is the sole frontend implementation in this repo.

## Backend contract
- Base URL: `http://localhost:8000`
- API prefix: `/api/v1`
- Residents snapshot: `/api/v1/residents`
- All frontend requests go through `src/services/api.ts`

## Main flow
1. `src/shared/resident-live-store.tsx` polls `/api/v1/residents`.
2. `src/adapters/residents.ts` maps backend residents into the UI resident model.
3. `src/App.tsx` renders the dashboard, alerts, charts, location map, push panel, and admin panels.
4. `src/components/admin/*` reads and writes backend data through `src/services/api.ts`.

## Local startup
```bash
cd backend/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd ../../frontend
npm install
npm run dev
```

## Cleanup decisions now reflected in code
- Only one frontend remains in the repo.
- No frontend-only simulator or shared simulator service worker.
- No fake local authentication.
- No local debug ingestion endpoint.
