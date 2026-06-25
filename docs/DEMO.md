# Elderly Care Demo Runbook

Goal: show Proactive Guardian Care as an elderly-care product, not a FlyCare derivative.

## Pre-demo Checklist

- Backend running: `http://localhost:8000/health`
- Frontend running: `http://localhost:5173`
- MySQL schema loaded: `database/mysql/Dump20260426.sql`
- MongoDB available if showing live watch telemetry.
- Offline router/server endpoint is `192.168.1.232`; do not ping, curl, or MQTT-smoke this IP as part of Codex validation.
- MQTT status available at `GET /api/v1/watch-commands/mqtt/status`.

## Offline Launcher

The compatibility launcher keeps its historical filename, but the product target is elderly care:

```powershell
.\scripts\start_flycare_offline_demo.ps1 -OpenBrowser
```

Expected browser URL:

```text
http://192.168.1.232:5173/position
```

`scripts/start_elderly_offline_demo.ps1` wraps the same launcher with an elderly-care name.

## Demo Surface

- `/` overview
- `/residents`
- `/position`
- `/operations`
- `/family`
- `/admin`
- `/flycare` redirects to `/position` and is not a visible demo surface.

## Demo Flow

1. Open `http://localhost:5173` for local development or `http://192.168.1.232:5173/position` for offline router demo.
2. Show Overview, then Residents.
3. Open Position and select a resident.
4. Verify the selected resident can refresh latest location from `GET /api/v1/mongo-upstream/location/latest`.
5. Trigger or inspect SOS/Fall events.
6. Resolve or mark the event as false alarm from Position or Admin Events.
7. Open Operations for the alert queue and Family for the resident-facing summary.
8. Open Admin only for controlled backend evidence: Residents, Events, Devices, Locations, Logs.

## SOS/Fall Evidence

- Event list: `GET /api/v1/events/`
- Event handling: `PUT /api/v1/events/{event_id}/handle`
- Neutral watch command: `POST /api/v1/watch-commands/alert/publish`
- Alert MQTT topic: `smartwatch/{device_id}/alert`
- Broker target: `192.168.1.232:1883`
- Supported command payload semantics: `event_type=sos|fall`, `action=activate|clear`

## Positioning Payload Evidence

- Backend stores `schema_version=2`, `scenario=elderly_care`, and a normalized `position` block in Mongo raw upstream documents.
- Coordinate space is `elderly_care_v1`, origin top-left, map asset `ElderlyCare.png`, image size `1755x2309`, real size `12.0m x 16.0m`.
- Legacy `location.current.x/y` payloads are accepted and converted to `position.current` with meters, ratios, pixels, `location_zone_id`, `zone_key`, and elderly-care room names.
- `/api/v1/mongo-upstream/latest` and `/api/v1/mongo-upstream/location/latest` return `position` alongside legacy `location`.

## Expected Update Timing

- Resident snapshot polling: every 10 seconds.
- Events polling hook: every 5 seconds.
- Position selected resident latest-location refresh: 1 second while selected.
- Full Position snapshot refresh: 2 seconds.

## Demo Boundary

Historical FlyCare docs under `docs/frontend-redesign/` and older position docs are reference material only. They are not part of the current public demo route, nav, API story, or slide/talk track.
