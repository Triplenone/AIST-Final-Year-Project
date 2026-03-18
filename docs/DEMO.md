# Demo runbook

Goal: show an end-to-end flow from **device payload → DB logs/events → live alerts → geofence → push notification**.

## Pre-demo checklist

- If using Docker: `docker compose -f docker-compose.demo.yml up --build`
- If running locally: backend running (`http://localhost:8000/health`) and frontend running (`http://localhost:5173`)
- MySQL schema loaded: `backend/Dump20251120.sql` (auto-imported in Docker demo)
- (Push demo) Configure VAPID keys in `backend/backend/.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`)

## Demo in ~90 seconds (talk track + clicks)

### 1) Open the primary dashboard

- Docker: `http://localhost:8000`
- Local dev: `http://localhost:5173`
- Point out the nav sections in `frontend/src/App.tsx` (`#overview`, `#residents`, `#location`, `#operations`, `#family`, `#admin`).

### 2) Show indoor + outdoor location map

- Click **Location**
- You should see:
  - Floorplan image overlay (`frontend/public/indoor-nursing-home-map.png`)
  - Zone polygons parsed from `LocationZone.geofence_coordinates` (`frontend/src/utils/geo.ts`)
  - Resident markers (from the shared resident store)
- Toggle **Outdoor** to show geofence zones (category `outdoor_area`) and breach list

Code: `frontend/src/components/LocationDashboard.tsx`

### 3) Trigger new device data + an auto-created fall event (backend)

In a terminal:

```bash
# Docker
docker compose -f docker-compose.demo.yml exec backend python test_data_reception.py

# Local
cd backend/backend
python test_data_reception.py
```

What it does (repo evidence):

- Sends `POST /api/v1/data-reception/receive` (script: `backend/backend/test_data_reception.py`)
- Backend stores a `device_data_log` row and, if `is_fall_confirmed=true`, auto-inserts an `event` row:
  - Route: `backend/backend/app/api/routes/data_reception.py`
  - Logic: `backend/backend/app/crud/device_data_log.py`

### 4) Verify in the UI (Live alerts + Admin tabs)

- Scroll to **Operations** → **Live alerts** to see backend events with actions
- Click **Residents** (or scroll to the Residents section) → this area includes the Admin tabs (`frontend/src/components/admin/AdminSection.tsx`).
- Open **Device Logs**:
  - Shows `/api/v1/device-data-log` + `/api/v1/data-reception/status` (see `frontend/src/components/admin/DeviceLogsAdmin.tsx`)
- Open **Events**:
  - Shows `/api/v1/events` and can update status via `/api/v1/events/{event_id}/handle`
  - UI code: `frontend/src/components/admin/EventsAdmin.tsx`
  - Backend route: `backend/backend/app/api/routes/events.py`

### 5) Trigger SOS / vitals / geofence events

Option A (fast demo): use **Admin → Events** and create:
- `sos` (status `unhandled`)
- `vital_signs_abnormal` with `event_params` like `{ "hr": 130, "spo2": 89 }`
- `geofence_breach` with `event_params` like `{ "lat": 22.3189, "lng": 114.1705 }`

Option B (device payload): extend your data-reception payload with optional keys:
- `sos_triggered: true`
- `vitals: { "hr": 130, "spo2": 89 }` + `vitals_abnormal: true`
- `geofence_breach: { "lat": 22.3189, "lng": 114.1705 }`

### 6) Outdoor map + breach list

- Switch **Location → Outdoor** view
- You should see geofence polygons and breach markers
- The right-hand panel lists breach events with ack/resolve actions

### 7) Push notification demo

- In **Operations → Push notifications**, click **Enable push**
- Click **Send test** (calls `/api/v1/push-subscriptions/test`)
- Confirm a notification appears (browser permission required)

### 8) Optional: Demo mode (frontend-only)

- Click **Simulate new data** (creates simulated vitals/status/location and pauses backend polling).
- Click **Exit demo mode** to return to backend polling.

Code: `frontend/src/App.tsx` + `frontend/src/shared/resident-live-store.tsx`

## Expected update timing (repo evidence)

- Residents snapshot polling: every **10s** (`frontend/src/shared/resident-live-store.tsx`)
- Events polling hook: every **5s** (`frontend/src/hooks/useBackendEvents.ts`)
- Locations refresh: every **15s** (`frontend/src/components/LocationDashboard.tsx`)
- Push notifications: immediate once subscribed (`/api/v1/push-subscriptions/test`)

If you don’t see changes immediately, wait one poll interval or use the Admin “Refresh” actions.
