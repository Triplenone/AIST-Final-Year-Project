# Demo runbook

Goal: show an end-to-end flow from **fall payload → DB logs/events → dashboard**.

## Pre-demo checklist

- Backend running (FastAPI): `http://localhost:8000/health`
- Frontend running (primary UI): `http://localhost:5173`
- MySQL schema loaded (recommended): `database/mysql/Dump20260426.sql`

## Demo in ~90 seconds (talk track + clicks)

### 1) Open the primary dashboard

- Open `http://localhost:5173`
- Point out the nav sections in `frontend/src/App.tsx` (`#overview`, `#residents`, `#location`, `#operations`, `#family`, `#admin`).

### 2) Show indoor location map

- Click **Location**
- You should see:
  - Floorplan image overlay (`frontend/public/indoor-nursing-home-map.png`)
  - Zone polygons parsed from `LocationZone.geofence_coordinates` (`frontend/src/utils/geo.ts`)
  - Resident markers (from the shared resident store)

Code: `frontend/src/components/LocationDashboard.tsx`

### 3) Trigger new device data + an auto-created fall event (backend)

In a terminal:

```bash
cd backend/backend
python test_data_reception.py
```

What it does (repo evidence):

- Sends `POST /api/v1/data-reception/receive` (script: `backend/backend/test_data_reception.py`)
- Backend stores a `device_data_log` row and, if `is_fall_confirmed=true`, auto-inserts an `event` row:
  - Route: `backend/backend/app/api/routes/data_reception.py`
  - Logic: `backend/backend/app/crud/device_data_log.py`

### 4) Verify in the UI (Admin tabs)

- Click **Residents** (or scroll to the Residents section) → this area includes the Admin tabs (`frontend/src/components/admin/AdminSection.tsx`).
- Open **Device Logs**:
  - Shows `/api/v1/device-data-log` + `/api/v1/data-reception/status` (see `frontend/src/components/admin/DeviceLogsAdmin.tsx`)
- Open **Events**:
  - Shows `/api/v1/events` and can update status via `/api/v1/events/{event_id}/handle`
  - UI code: `frontend/src/components/admin/EventsAdmin.tsx`
  - Backend route: `backend/backend/app/api/routes/events.py`

### 5) Optional: Demo mode (frontend-only)

- Click **Simulate new data** (creates simulated vitals/status/location and pauses backend polling).
- Click **Exit demo mode** to return to backend polling.

Code: `frontend/src/App.tsx` + `frontend/src/shared/resident-live-store.tsx`

### 6) Optional: ITP4458 campus mini-project demo

- Open `http://localhost:5173/campus`
- The page demonstrates the ITP4458 flow: smartwatch sensing -> BLE / Wi-Fi / MQTT communication -> backend / Mongo upstream -> dashboard visualization.
- The campus map is loaded from `frontend/src/assets/campus-map.png`.
- The smartwatch marker is a frontend overlay only; the base map image remains clean.
- The page falls back to demo data when the backend is offline.

## Expected update timing (repo evidence)

- Residents snapshot polling: every **10s** (`frontend/src/shared/resident-live-store.tsx`)
- Events polling hook: every **5s** (`frontend/src/hooks/useBackendEvents.ts`)
- Locations refresh: every **15s** (`frontend/src/components/LocationDashboard.tsx`)

If you don’t see changes immediately, wait one poll interval or use the Admin “Refresh” actions.
