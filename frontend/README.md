# SmartCare React Frontend

This is the only supported frontend in the repository.
It is a React + Vite + TypeScript application that connects directly to the FastAPI backend under `/api/v1/*`.

## Scope
- Resident overview and metrics sourced from backend data.
- Admin CRUD panels mapped to backend resources.
- Location dashboard for indoor map and outdoor breach monitoring.
- Push subscription UI backed by backend push endpoints.

## Removed from the active frontend
- Legacy dashboard copies.
- Frontend-only simulator flows.
- Mock auth and local demo accounts.
- Local debug ingestion hooks.

## Run locally
```bash
cd frontend
npm install
npm run dev
```

Default Vite URL: `http://localhost:5173`

## Integration boundaries
- `src/services/api.ts` is the only frontend entry point for backend requests.
- `src/types/backend.ts` defines backend DTOs.
- `src/types/resident.ts` defines the UI resident model.
- `src/adapters/residents.ts` maps backend residents into UI residents.
- `src/shared/resident-live-store.tsx` hydrates and polls residents from `/api/v1/residents`.

## Verification
```bash
npm run build
npm run test
npm run test:e2e
```
