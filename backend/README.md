# Backend (FastAPI + MySQL)

The FastAPI app lives in [`backend/backend/`](backend/).

## Quick start

```bash
cd backend/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Health: `GET /health`
- OpenAPI: `GET /docs`
- API prefix: `/api/v1` (see `backend/app/config.py`)

## Database

- DB driver: MySQL via `mysql+pymysql://...` (see `backend/app/config.py` and `backend/app/database.py`)
- Schema + seed dump: [`../database/mysql/Dump20260426.sql`](../database/mysql/Dump20260426.sql)
- **DB import command**: Not found in repo (use your preferred MySQL client/tooling to import the dump).

## Configuration (env vars)

Backend loads `.env` (pydantic-settings `env_file = ".env"`):

- `DB_HOST` (default `localhost`)
- `DB_PORT` (default `3306`)
- `DB_USER` (default `root`)
- `DB_PASSWORD` (default `root`)
- `DB_NAME` (default `smart_elderly_care_system`)
- `DEBUG` (default `True`)
- `MQTT_BROKER` (default `192.168.1.232`, the demo router/broker IP)
- `MQTT_PORT` (default `1883`)

Template: `backend/.env.example` (copy to `backend/.env`).

See: `backend/.env.example`, `backend/.env`, and `backend/app/config.py`.

## Indoor Positioning Payload Schema

Mongo raw upstream writes preserve the original `payload` and add normalized elderly-care fields:

- `schema_version`: `2`
- `scenario`: `elderly_care`
- `position.coordinate_space`: `elderly_care_v1`
- `position.map_asset`: `ElderlyCare.png`
- `position.map_width_px/map_height_px`: `1755/2309`
- `position.real_width_m/real_height_m`: `12.0/16.0`
- `position.current`: meters, ratios, pixels, `location_zone_id`, `zone_key`, room `name`, `accuracy_m`, `quality`
- `position.beacons`: MAC, elderly-care alias, zone, meter coordinates, RSSI, distance, confidence

Legacy `location.current.x/y` payloads are accepted and normalized by `backend/app/services/position_normalizer.py`. Query routes under `/api/v1/mongo-upstream/*` return the additive `position` field alongside legacy `location`.

Device aliases for the six demo wearables live in `backend/config/device_id_map.json`.

## Routes (verified)

Base prefix: `/api/v1`

- `/users` — `backend/app/api/routes/users.py`
- `/devices` — `backend/app/api/routes/devices.py`
- `/locations` — `backend/app/api/routes/locations.py`
- `/events` — `backend/app/api/routes/events.py` (includes `PUT /events/{event_id}/handle`)
- `/kpi` — `backend/app/api/routes/kpi.py`
- `/residents` — `backend/app/api/routes/residents.py`
- `/user-status` — `backend/app/api/routes/user_status.py`
- `/device-data-log` — `backend/app/api/routes/device_data_log.py`
- `/data-reception` — `backend/app/api/routes/data_reception.py` (`POST /receive`, `GET /status`)

For the full generated contract, open `GET /docs`.

## Data reception test (verified)

This repo includes a manual integration test script:

```bash
cd backend/backend
python test_data_reception.py
```

It posts to `POST /api/v1/data-reception/receive` and can auto-create a `fall` event when `is_fall_confirmed=true` (see `backend/app/crud/device_data_log.py`).

## Position normalizer fixture

```bash
cd backend
python backend/test_position_normalizer.py
```

This checks legacy `location.current.x/y` conversion and schema v2 `position` normalization without requiring MongoDB, MySQL, MQTT, or the offline router IP.
