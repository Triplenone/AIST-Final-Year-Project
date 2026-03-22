# Troubleshooting

## Backend

### `GET /health` fails (404)

- This repo implements **`/health`**, not `/healthz`.
- Entry: `backend/backend/app/main.py`

### Backend crashes on startup (DB connection error)

- Check `backend/backend/.env` (or copy from `backend/backend/.env.example`).
- Env vars are loaded by `backend/backend/app/config.py`.

### `/api/v1/residents` returns empty list

- The residents endpoint filters for `User.role_type == 'elderly'` (`backend/backend/app/api/routes/residents.py`).
- Ensure your DB has elderly users.

### `POST /api/v1/data-reception/receive` returns “设备不存在”

- The `device_id` must exist in the `device` table (`backend/backend/app/crud/device_data_log.py`).
- Use seed data from `backend/Dump20251120.sql` (import method: Not found in repo).

### Fall event not auto-created after sending a fall payload

- Auto-event creation only happens if the device row has a non-NULL `elderly_user_id`.
- Logic: `backend/backend/app/crud/device_data_log.py`

## Frontend (`frontend/`)

### UI shows errors fetching `/api/v1/*`

- Check the backend base URL in `frontend/src/constants/backend.ts` (no `import.meta.env` support in this repo).
- Backend default: `http://localhost:8000`

### “Nothing updates” after triggering events

The UI uses polling (not SSE):

- Residents: every **10s** (`frontend/src/shared/resident-live-store.tsx`)
- Events hook: every **5s** (`frontend/src/hooks/useBackendEvents.ts`)
- Locations: every **15s** (`frontend/src/components/LocationDashboard.tsx`)

Wait one poll interval or use the Admin refresh actions.

### Indoor map is blank

- The floorplan image must load: `frontend/public/indoor-nursing-home-map.png`
- Locations API must return polygons:
  - `GET /api/v1/locations/` (frontend: `frontend/src/components/LocationDashboard.tsx`)
  - `geofence_coordinates` is parsed by `frontend/src/utils/geo.ts`

## Infra (`infra/`)

### `docker compose ... up --build` fails

This is expected today:

- Backend Dockerfile: **Not found** in repo (compose uses `build: ../backend`)
- DB mismatch: compose uses Postgres/Timescale, backend uses MySQL

See: `infra/README.md`.
