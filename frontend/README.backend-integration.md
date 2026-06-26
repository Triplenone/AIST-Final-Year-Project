# FlyCare Backend Integration

The active frontend is `frontend/`, a React/Vite/TypeScript app backed by FastAPI under `backend/backend`.

## Architecture

- Frontend dev URL: `http://127.0.0.1:5173`
- Backend API URL: `http://127.0.0.1:8001/api/v1`
- Health check: `http://127.0.0.1:8001/health`
- MQTT status: `/api/v1/flycare-admin/mqtt/status`
- Live upstream data: `/api/v1/mongo-upstream/`

The backend database still uses the legacy MySQL schema name `smart_elderly_care_system`. Frontend-facing labels are FlyCare/passenger-oriented, but these backend contracts intentionally remain unchanged for now:

- `/api/v1/residents`
- `elderly_user_id`
- role enum value `elderly`
- `search-elder-detail`

Do not rename those contracts in frontend-only cleanup work.

## Runtime Setup

Backend:

```powershell
cd backend/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Frontend:

```powershell
cd frontend
npm run dev -- --host 0.0.0.0
```

Firmware build:

```powershell
cd firmware
arduino-cli compile --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" .
```

If `arduino-cli` is not on `PATH`, use `C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe`.

## Mapping

`frontend/src/adapters/residents.ts` maps backend `BackendResident` rows into the UI `Resident` shape. `frontend/src/shared/resident-live-store.tsx` refreshes that data and exposes it to overview, position, FlyCare, and admin surfaces.

`frontend/src/services/api.ts` contains the API clients. When backend schema changes, update the matching TypeScript types and adapter tests in the same task.

## Validation Commands

```powershell
cd frontend
npm run test
npm run lint
npm run build:static

cd ../backend/backend
python -m compileall app
```

Browser smoke targets:

- `/`
- `/flycare`
- `/position`
- `/admin`
