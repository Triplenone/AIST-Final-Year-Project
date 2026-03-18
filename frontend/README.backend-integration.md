# Frontend Backend Integration

This document describes the current integration boundary between the React + Vite frontend and the FastAPI backend.

## Current contract
- Backend base URL: http://localhost:8000
- API prefix: /api/v1
- Frontend API entry point: src/services/api.ts
- Backend DTO definitions: src/types/backend.ts
- UI resident model: src/types/resident.ts
- Resident adapter: src/adapters/residents.ts

## Resident data flow
1. esidentApi.list() fetches /api/v1/residents.
2. mapBackendResidents() converts backend residents into UI residents.
3. ResidentLiveProvider stores the mapped residents and refresh metadata.
4. The provider refreshes immediately on mount and then polls every 10 seconds.

## Important rules
- Components do not build backend URLs directly.
- Backend shape changes first land in src/types/backend.ts.
- UI mapping changes land in src/adapters/residents.ts.
- Components consume mapped UI models, not raw backend payloads.

## Push notifications
- The frontend registers public/push-sw.js.
- Push subscription setup is handled only through pushSubscriptionApi inside src/services/api.ts.
- Push support no longer shares a simulator service worker.

## Removed
- Frontend-only simulator endpoints and service worker logic.
- Mock authentication and local account storage.
- Local debug ingestion calls.
