# Elderly Care Demo Ready Checklist

This checklist is the acceptance target for branch `elderly-care-demo-ready`.

## Frontend

- `/`, `/residents`, `/position`, `/operations`, `/family`, `/admin` render.
- `/flycare` redirects to `/position`.
- Header and nav present the elderly-care product only.
- User-facing frontend text does not mention FlyCare, airport, flight, gate, or passenger.
- Position keeps selected resident latest-location refresh, SOS/Fall marker alerts, tooltip/focus behavior, and event handling.

## Backend

- Existing elderly contracts remain: `/api/v1/residents`, `/api/v1/events`, `/api/v1/mongo-upstream/location/latest`.
- Mongo upstream save/query path adds normalized `position` with `schema_version=2`, `scenario=elderly_care`, `coordinate_space=elderly_care_v1`, `ElderlyCare.png`, `1755x2309`, and `12.0m x 16.0m`.
- Legacy `location.current.x/y` remains accepted and is converted to `position.current` for frontend pins and API consumers.
- Flight-specific Mongo route and MQTT subscriber topic are removed.
- Neutral command route exists: `POST /api/v1/watch-commands/alert/publish`.
- MQTT status exists: `GET /api/v1/watch-commands/mqtt/status`.
- Demo router and MQTT broker remain `192.168.1.232:1883`.
- Codex validation must not ping, curl, MQTT pub/sub, or serial-bridge against `192.168.1.232`.
- Device binding remains based on `device.elderly_user_id` and `backend/backend/config/device_id_map.json`.

## Offline Launcher

```powershell
.\scripts\start_flycare_offline_demo.ps1 -OpenBrowser
```

This filename is retained for historical compatibility only. The expected demo URL is `http://192.168.1.232:5173/position`, and `scripts/start_elderly_offline_demo.ps1` wraps the same launcher.

## Demo Smoke

```powershell
cd frontend
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

```powershell
cd backend
python -m compileall backend/app
python backend/test_position_normalizer.py
```

Optional live backend checks:

```powershell
curl.exe http://127.0.0.1:8000/health
curl.exe http://127.0.0.1:8000/api/v1/residents/
curl.exe http://127.0.0.1:8000/api/v1/events/
curl.exe http://127.0.0.1:8000/api/v1/watch-commands/mqtt/status
```

## Firmware Boundary

Firmware conversion is staged after the web/backend demo is accepted. The firmware target is elderly-care-only display behavior: location, vitals, SOS, Fall, battery/network, and care alerts, while preserving the proven nonblocking vibration, BLE/MQTT ownership, direct MQTT, serial fallback, and offline router timeout behavior.
