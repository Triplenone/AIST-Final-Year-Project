# Architecture

This document separates what is **implemented in the repo** from what is **planned in the PDFs**.

## Implemented (repo)

### Components

```mermaid
flowchart LR
  Browser[Browser] --> ReactUI[ReactUI_frontend]
  ReactUI -->|"GET /api/v1/*"| FastAPI[FastAPI_backend]
  DeviceOrScript[DeviceOrTestScript] -->|"POST /api/v1/data-reception/receive"| FastAPI
  FastAPI --> MySQL[(MySQL_smart_elderly_care_system)]

  AdminUI[OptionalAdminUI_backend_forntend] -.->|"GET /api/v1/* (via proxy)"| FastAPI
  LegacyUI[LegacyStaticUI_frontend_web_dashboard] -.->|"Frontend_only_mock"| Browser
```

Evidence pointers:

- Frontend base URL + API prefix: `frontend/src/constants/backend.ts`
- FastAPI entry: `backend/backend/app/main.py`
- Routers: `backend/backend/app/api/routes/__init__.py`
- DB schema: `backend/Dump20251120.sql`

### Implemented fall pipeline (end-to-end)

```mermaid
sequenceDiagram
  participant Script as DeviceOrTestScript
  participant API as FastAPI
  participant DB as MySQL
  participant UI as ReactDashboard

  Script->>API: POST /api/v1/data-reception/receive
  API->>DB: INSERT device_data_log
  alt is_fall_confirmed=true
    API->>DB: INSERT event (event_type=fall, status=unhandled)
  end
  UI->>API: GET /api/v1/device-data-log
  UI->>API: GET /api/v1/events
  UI->>API: GET /api/v1/residents
  API->>DB: SELECT logs/events/users
  API-->>UI: JSON lists
```

Evidence pointers:

- Route: `backend/backend/app/api/routes/data_reception.py`
- Auto-event creation: `backend/backend/app/crud/device_data_log.py`
- Test script: `backend/backend/test_data_reception.py`

## Planned (from PDFs — not fully implemented in repo)

The Initial Report lists functional requirements such as indoor localization, outdoor geofence breach alerts, and caregiver notifications (`Initial_Report_Grp_10.pdf`, pp.25–27).

The diagram below is **descriptive** (from PDFs) and should not be treated as implemented.

```mermaid
flowchart LR
  Wearable[SmartWearable] -->|"Sensor_data"| EdgeLogic[OnDevice_FallDetection]
  Wearable -->|"BLE_scan"| Beacons[BLE_Beacons]
  Wearable -->|"GPS"| GPS[GPS]
  Wearable -->|"Network"| MQTT[MQTT_Broker]

  MQTT --> Backend[Backend_API]
  Backend --> DB2[(Database)]
  Backend --> AI[AI_Analytics]
  Backend --> Notify[Notifications_PushSMS]

  Caregiver[Caregiver_UI] --> Backend
  Family[Family_UI] --> Backend
```

## Infra status (repo)

The `infra/` folder contains a docker-compose scaffold, but it is **not aligned** with the current backend:

- compose DB: Postgres/Timescale (`infra/docker-compose.dev.yml`)
- backend implemented DB: MySQL (`backend/backend/app/config.py`)
- backend Dockerfile: **Not found** (compose has `build: ../backend`)

See: `infra/README.md`.
