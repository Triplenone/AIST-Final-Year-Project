# GitHub Setup Playbook

Below is a complete, copy-pasteable **GitHub setup playbook** that Codex (or any engineer) can follow to create a repository and project environment that **matches our proposal’s architecture and constraints** (Wi-Fi–only, GNSS on watch, BLE beacons, MQTT/TLS backend, PWA + Web Push, analytics, OTA, no native mobile app, and optional edge). It uses a **monorepo** so cross-module integration (firmware ⇄ backend ⇄ PWA ⇄ data/AI) is testable end-to-end from day 1.

---

# 0) Repository meta

**Repo name (suggested):** `smart-elderly-care-fyp`
**Visibility:** Private (can switch to public before competitions)
**Default branch:** `main`
**Branch model:**

* `main` (release) → protected
* `dev` (integration)
* feature branches: `feat/<area>-<short-desc>`
* hotfix branches: `hotfix/<issue-no>-<short-desc>`

**Protection rules for `main`:**

* Require PR, 1+ code owners review, status checks (CI) must pass
* Require signed commits (optional but recommended)
* Disallow force-push and deletions

**Teams & CODEOWNERS (align with Division of Work):**

```
# .github/CODEOWNERS
/firmware/              @Million
/backend/               @Oscar @Lin
/frontend/              @Benjamin
/ai/                    @Oscar
/docs/                  @Oscar
/.github/               @Oscar
```

**Labels (create upfront):** `area:firmware`, `area:backend`, `area:frontend`, `area:ai`, `area:infra`, `priority:P0|P1|P2`, `type:bug|feat|chore|docs`, `status:blocked|in-review`, `good-first-issue`.

**Milestones:** Create milestones to mirror schedule.png (use exact names/dates when you fill them). Examples: `Proposal Sign-off`, `Alpha (Indoor BLE)`, `Beta (GNSS+Geofence)`, `System Test`, `Final Submission`.

**Project board:** GitHub Projects (Kanban) columns — `Backlog`, `In Progress`, `Review`, `Ready for Test`, `Done`.

---

# 1) Monorepo structure

```text
smart-elderly-care-fyp/
├─ firmware/                         # ESP32 watch firmware (Wi-Fi, BLE scan, GNSS, MQTT/TLS, SOS)
│  ├─ platformio.ini
│  ├─ src/
│  │  ├─ main.cpp
│  │  ├─ sensors/
│  │  │  ├─ imu_mpu6050.cpp/.h
│  │  │  ├─ max30102.cpp/.h
│  │  │  └─ gnss_atgm336h.cpp/.h
│  │  ├─ net/
│  │  │  ├─ wifi_client.cpp/.h
│  │  │  ├─ mqtt_client.cpp/.h
│  │  │  └─ ota_client.cpp/.h
│  │  ├─ ble/
│  │  │  └─ beacon_scanner.cpp/.h      # scan iBeacon/Eddystone, emit {beacon_id, rssi}
│  │  └─ util/
│  │     └─ config.h.example           # Wi-Fi SSID, MQTT host, TLS certs (dev)
│  ├─ include/
│  ├─ test/                            # Unity tests for small modules
│  └─ certs_dev/                       # mkcert self-signed CA (dev only, git-ignored in real)
│
├─ backend/                            # FastAPI (Python) + MQTT bridge + RBAC + Geofence + Web Push
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ api/                          # /api/v1/...
│  │  │  ├─ routes_residents.py        # CRUD residents
│  │  │  ├─ routes_devices.py          # bind/activate devices
│  │  │  ├─ routes_events.py           # fall, sos, geofence alerts
│  │  │  ├─ routes_telemetry.py        # GNSS + BLE ingestion (HTTP fallback)
│  │  │  ├─ routes_push.py             # VAPID keys, subscriptions
│  │  │  └─ routes_ota.py              # upload firmware, schedule update
│  │  ├─ services/
│  │  │  ├─ mqtt_bridge.py             # subscribe commands, publish downlink
│  │  │  ├─ geofence.py                # point-in-polygon, entry/exit detection
│  │  │  ├─ fall_verify.py             # server-side fall verification/rules
│  │  │  ├─ push.py                    # Web Push (VAPID) send
│  │  │  └─ ota.py                     # store artifacts (MinIO), sign, versioning
│  │  ├─ models/                       # SQLAlchemy models
│  │  │  ├─ resident.py, device.py, event.py, telemetry_gnss.py, telemetry_ble.py, geofence.py, user.py, role.py
│  │  ├─ schemas/                      # Pydantic
│  │  ├─ auth/                         # JWT, RBAC
│  │  ├─ db/
│  │  │  ├─ session.py
│  │  │  └─ migrations/                # alembic migrations
│  │  ├─ workers/                      # Celery/Dramatiq (optional for async analytics)
│  │  └─ config.py
│  ├─ tests/                           # pytest
│  ├─ Dockerfile
│  └─ requirements.txt
│
├─ frontend/                           # PWA (Vite + React + TS)
│  ├─ src/
│  │  ├─ app.tsx
│  │  ├─ components/
│  │  │  ├─ MapView.tsx                # MapLibre + indoor zones
│  │  │  ├─ AlertsPanel.tsx
│  │  │  ├─ ResidentList.tsx
│  │  │  └─ DeviceDetail.tsx
│  │  ├─ services/
│  │  │  ├─ api.ts                     # REST client
│  │  │  └─ ws.ts                      # live updates via WebSocket (optional)
│  │  ├─ sw.ts                         # service worker (push, cache)
│  │  ├─ push.ts                       # subscribe/unsubscribe push, VAPID
│  │  └─ styles/
│  ├─ public/                          # manifest.json, icons
│  ├─ vite.config.ts
│  ├─ package.json
│  └─ tsconfig.json
│
├─ ai/                                 # ML notebooks & services (fall models, risk scoring)
│  ├─ notebooks/
│  │  ├─ 01_eda.ipynb
│  │  ├─ 02_fall_model_baseline.ipynb  # e.g., threshold + classical ML baseline
│  │  └─ 03_risk_scoring.ipynb
│  ├─ service/                         # optional: model service callable by backend
│  │  ├─ server.py                     # FastAPI microservice or package imported by backend
│  │  └─ Dockerfile
│  └─ requirements.txt
│
├─ infra/                              # local dev orchestration (Docker Compose, Mosquitto, DB, MinIO)
│  ├─ docker-compose.dev.yml
│  ├─ mosquitto/
│  │  ├─ mosquitto.conf
│  │  └─ certs/                        # dev CA/server certs (auto-generated by script)
│  ├─ minio/
│  │  └─ create-buckets.sh
│  ├─ sql/                             # schema/seed data
│  │  ├─ 000_init.sql
│  │  └─ 010_sample_geofences.sql
│  └─ mkcert-dev-certs.sh
│
├─ tests-e2e/                          # Cypress (frontend), k6 or Playwright for API perf
│
├─ docs/                               # mkdocs or Docusaurus site (optional)
│  ├─ SYSTEM_DESIGN.md                 # mirrors proposal diagrams/decisions
│  ├─ API.md                           # REST + MQTT topics
│  ├─ DATA_DICTIONARY.md               # fields, types, constraints
│  ├─ OTA.md                           # process, topics, versioning
│  └─ SECURITY.md
│
├─ .github/
│  ├─ workflows/
│  │  ├─ ci-frontend.yml
│  │  ├─ ci-backend.yml
│  │  ├─ ci-firmware.yml
│  │  ├─ ci-ai.yml
│  │  ├─ docker-publish.yml
│  │  └─ codeql.yml
│  ├─ ISSUE_TEMPLATE/bug_report.md
│  ├─ ISSUE_TEMPLATE/feature_request.md
│  └─ PULL_REQUEST_TEMPLATE.md
│
├─ .devcontainer/                      # Codespaces / VSCode Dev Containers
│  └─ devcontainer.json
├─ .pre-commit-config.yaml
├─ LICENSE
├─ CONTRIBUTING.md
├─ README.md
└─ Makefile
```

---

# 2) Initialize repo & scaffolding (commands)

```bash
# create repo locally
mkdir smart-elderly-care-fyp && cd smart-elderly-care-fyp
git init -b main

# basic files
echo "# Smart Wearable × Smart Elderly Care Home (FYP)" > README.md
touch LICENSE CONTRIBUTING.md

# create directories from the tree above (or let Codex generate)
mkdir -p firmware/src/include firmware/test firmware/certs_dev
mkdir -p backend/app/{api,services,models,schemas,auth,db/migrations,workers}
mkdir -p backend/tests
mkdir -p frontend/src/{components,services,styles} frontend/public
mkdir -p ai/{notebooks,service}
mkdir -p infra/{mosquitto/certs,minio,sql}
mkdir -p .github/workflows .github/ISSUE_TEMPLATE tests-e2e docs .devcontainer
```

---

# 3) Local dev stack (Docker Compose)

`infra/docker-compose.dev.yml`

```yaml
version: "3.9"
services:
  mqtt:
    image: eclipse-mosquitto:2
    container_name: mqtt
    restart: unless-stopped
    ports: ["1883:1883", "8883:8883"]
    volumes:
      - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ./mosquitto/certs:/mosquitto/certs:ro

  db:
    image: timescale/timescaledb:latest-pg16
    container_name: db
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=app
      - POSTGRES_DB=eldercare
    ports: ["5432:5432"]
    volumes:
      - dbdata:/var/lib/postgresql/data
      - ./sql:/docker-entrypoint-initdb.d:ro

  minio:
    image: quay.io/minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minio
      - MINIO_ROOT_PASSWORD=minio123
    ports: ["9000:9000", "9001:9001"]
    volumes: [ "minio:/data" ]

  backend:
    build: ../backend
    depends_on: [mqtt, db, minio]
    environment:
      - DATABASE_URL=postgresql+psycopg://app:app@db:5432/eldercare
      - MQTT_URL=mqtts://mqtt:8883
      - MQTT_USERNAME=dev
      - MQTT_PASSWORD=dev
      - MQTT_CA=/etc/ssl/certs/ca.crt
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=minio
      - MINIO_SECRET_KEY=minio123
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - JWT_SECRET=devsecret
      - ALLOW_ORIGINS=http://localhost:5173
    ports: ["8000:8000"]
    volumes: [ "../backend:/app" ]

  frontend:
    image: node:20
    working_dir: /work
    command: bash -lc "npm ci && npm run dev -- --host"
    volumes: [ "../frontend:/work" ]
    ports: ["5173:5173"]
    environment:
      - VITE_API_BASE=http://localhost:8000
      - VITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}

volumes:
  dbdata:
  minio:
```

**Mosquitto config (`infra/mosquitto/mosquitto.conf`):**

```conf
listener 1883 0.0.0.0
allow_anonymous true

listener 8883 0.0.0.0
cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
require_certificate false
allow_anonymous true
```

**Dev CA generation helper (`infra/mkcert-dev-certs.sh`):**

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/mosquitto/certs"
mkcert -install
mkcert -cert-file server.crt -key-file server.key localhost 127.0.0.1 ::1 mqtt
cp "$(mkcert -CAROOT)/rootCA.pem" ca.crt
```

Run:

```bash
bash infra/mkcert-dev-certs.sh
docker compose -f infra/docker-compose.dev.yml up -d --build
```

---

# 4) Backend skeleton (FastAPI)

`backend/requirements.txt`

```
fastapi[all]==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.32
psycopg[binary]==3.2.1
alembic==1.13.2
pydantic==2.8.2
paho-mqtt==1.6.1
asyncio-mqtt==0.16.1
pywebpush==1.14.0
python-jose==3.3.0
passlib[bcrypt]==1.7.4
shapely==2.0.4
minio==7.2.7
```

`backend/app/main.py` (excerpt):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_residents, routes_devices, routes_events, routes_push, routes_ota, routes_telemetry
from app.services.mqtt_bridge import start_mqtt

app = FastAPI(title="Eldercare Backend", version="0.1.0")

app.add_middleware(CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOW_ORIGINS","*").split(",")],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def _startup():
    await start_mqtt(app)  # connect, subscribe to topics for commands/telemetry as needed

app.include_router(routes_residents.router, prefix="/api/v1/residents", tags=["residents"])
app.include_router(routes_devices.router,   prefix="/api/v1/devices",   tags=["devices"])
app.include_router(routes_events.router,    prefix="/api/v1/events",    tags=["events"])
app.include_router(routes_telemetry.router, prefix="/api/v1/telemetry", tags=["telemetry"])
app.include_router(routes_push.router,      prefix="/api/v1/push",      tags=["push"])
app.include_router(routes_ota.router,       prefix="/api/v1/ota",       tags=["ota"])
```

**MQTT topics (document in `docs/API.md`):**

* Uplink from watch:
  `devices/<deviceId>/telemetry/gnss` → `{ts, lat, lon, hdop, speed, fix_age}`
  `devices/<deviceId>/telemetry/ble`  → `{ts, beacon_id, rssi}`
  `devices/<deviceId>/events`          → `{type: "fall|sos|geofence", ...}`
* Downlink to watch:
  `devices/<deviceId>/cmd`             → `{action: "cfg|ping|ota", payload...}`
  `devices/<deviceId>/ota`             → `{version, url, sha256, size}`

**DB schema (Timescale/Postgres)** – put SQL in `infra/sql/000_init.sql`:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','caregiver','viewer')),
  created_at timestamptz default now()
);

create table residents (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  notes text
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  device_sn text unique not null,
  model text,
  registered_at timestamptz default now(),
  resident_id uuid references residents(id)
);

create table telemetry_gnss (
  device_id uuid references devices(id),
  ts timestamptz not null,
  lat double precision not null,
  lon double precision not null,
  hdop real,
  speed real,
  fix_age real,
  primary key (device_id, ts)
);
select create_hypertable('telemetry_gnss','ts', if_not_exists => true);

create table telemetry_ble (
  device_id uuid references devices(id),
  ts timestamptz not null,
  beacon_id text not null,
  rssi smallint,
  primary key (device_id, ts, beacon_id)
);
select create_hypertable('telemetry_ble','ts', if_not_exists => true);

create table events (
  id bigserial primary key,
  device_id uuid references devices(id),
  ts timestamptz not null default now(),
  type text not null check (type in ('fall','sos','geofence_enter','geofence_exit','battery_low')),
  payload jsonb
);

create table geofences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  polygon_geojson jsonb not null
);
```

---

# 5) Frontend (React + Vite PWA)

`frontend/package.json` (key scripts)

```json
{
  "name": "eldercare-pwa",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "maplibre-gl": "^4.3.2",
    "idb": "^7.1.1",
    "axios": "^1.7.2"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vite": "^5.4.1",
    "workbox-window": "^7.1.0",
    "@vite-pwa/vite-plugin": "^0.20.0",
    "eslint": "^9.9.0",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.0"
  }
}
```

**Service worker basics (`frontend/src/sw.ts`)** – subscribe to push, show notifications; cache shell for offline.

**Pages:**

* Dashboard: map (GNSS positions when outdoors; indoor zones via beacons)
* Alerts: live list (fall, SOS, geofence)
* Resident/Device settings

---

# 6) Firmware (ESP32 via PlatformIO/Arduino)

`firmware/platformio.ini`

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
  adafruit/Adafruit MPU6050@^2.2.6
  sparkfun/SparkFun MAX3010x Pulse and Proximity Sensor Library@^1.1.2
  mikalhart/TinyGPSPlus@^1.0.3
  knolleary/PubSubClient@^2.8
  bblanchon/ArduinoJson@^7.0.4
build_flags =
  -DCORE_DEBUG_LEVEL=0
```

`firmware/src/main.cpp` should:

* Connect to configured Wi-Fi (campus AP or phone hotspot), retry with backoff
* Start BLE scan (beacon IDs + RSSI) and GNSS (TinyGPS++ reading NMEA from ATGM336H UART) with **duty-cycling**
* Publish telemetry to MQTT over TLS 8883 (load CA cert from SPIFFS)
* Subscribe `devices/<id>/cmd` and `devices/<id>/ota`
* On `ota` message: verify signature/hash; download over HTTPS; apply OTA; report status
* SOS button long-press → publish `events` with `type="sos"`

**`config.h.example`**

```cpp
#define WIFI_SSID      "YOUR_WIFI"
#define WIFI_PASSWORD  "YOUR_PASS"
#define MQTT_HOST      "your.dev.host"
#define MQTT_PORT      8883
#define MQTT_CLIENT_ID "watch-<SN>"
#define MQTT_USER      "dev"
#define MQTT_PASS      "dev"
#define DEVICE_ID      "<uuid>"
#define CA_CERT_PATH   "/ca.crt"
```

---

# 7) Web Push (VAPID) keys

Generate once (store in GitHub Secrets & `.env` for dev):

```bash
# using node web-push or pywebpush; example with node
npx web-push generate-vapid-keys
# set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in repo secrets & compose env
```

---

# 8) GitHub Actions (CI/CD)

**Frontend CI** – `.github/workflows/ci-frontend.yml`

```yaml
name: Frontend CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - uses: actions/upload-artifact@v4
        with: { name: pwa-dist, path: frontend/dist }
```

**Backend CI** – `.github/workflows/ci-backend.yml`

```yaml
name: Backend CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env: { POSTGRES_USER: app, POSTGRES_PASSWORD: app, POSTGRES_DB: eldercare }
        ports: [ "5432:5432" ]
        options: >-
          --health-cmd="pg_isready -U app -d eldercare"
          --health-interval=10s --health-timeout=5s --health-retries=5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Install
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Lint & Tests
        run: |
          cd backend
          pytest -q
```

**Firmware CI** – `.github/workflows/ci-firmware.yml`

```yaml
name: Firmware CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    container: ghcr.io/platformio/platformio-core:latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          cd firmware
          pio pkg install
          pio run
```

**AI CI** – `.github/workflows/ci-ai.yml`

```yaml
name: AI CI
on: [push, pull_request]
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: |
          cd ai
          pip install -r requirements.txt
          python - <<'PY'
          print("AI env OK")  # placeholder smoke
          PY
```

**Docker publish (optional)** – pushes `backend` and `ai/service` images to GHCR:
`.github/workflows/docker-publish.yml`

```yaml
name: Publish Containers
on:
  push:
    tags: ["v*.*.*"]
jobs:
  backend:
    runs-on: ubuntu-latest
    permissions: { packages: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:${{ github.ref_name }}
```

**Security** – CodeQL & Dependabot:

* `.github/workflows/codeql.yml` via Actions template
* `.github/dependabot.yml` for npm/pip/docker updates

---

# 9) Secrets (GitHub → Settings → Secrets and variables → Actions)

Add as **repository secrets** (CI will read them; local dev uses `.env` or compose):

* `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
* `JWT_SECRET`
* (If deploying) `PROD_DATABASE_URL`, `PROD_MQTT_URL`, `PROD_MINIO_*`
* `CODECOV_TOKEN` (optional)

---

# 10) Issue/PR templates

`.github/ISSUE_TEMPLATE/bug_report.md`

```md
### Bug
**Area:** firmware | backend | frontend | ai | infra
**Steps to Reproduce**
**Expected**
**Actual**
**Logs/Screenshots**
```

`.github/ISSUE_TEMPLATE/feature_request.md`

```md
### Feature
**Motivation / User Story**
**Scope (acceptance criteria)**
**API/DB changes?**
**Test plan**
```

`PULL_REQUEST_TEMPLATE.md`

```md
### Summary
- [ ] Matches architecture (Wi-Fi only; GNSS on watch; BLE beacons)
- [ ] MQTT topics and TLS unchanged
- [ ] Tests added / updated
- [ ] Docs updated (API/DATA_DICTIONARY)

Closes #
```

---

# 11) Pre-commit & quality

`.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.8.0
    hooks: [{id: black, files: ^backend/}]
  - repo: https://github.com/pycqa/flake8
    rev: 7.1.1
    hooks: [{id: flake8, files: ^backend/}]
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v4.0.0-alpha.8
    hooks: [{id: prettier, files: ^frontend/}]
  - repo: https://github.com/igorshubovych/markdownlint-cli
    rev: v0.41.0
    hooks: [{id: markdownlint, files: \.md$}]
```

---

# 12) Developer workflow (daily)

```bash
# 1) Start local stack
docker compose -f infra/docker-compose.dev.yml up -d --build

# 2) Backend dev
cd backend && uvicorn app.main:app --reload --port 8000

# 3) Frontend dev
cd frontend && npm ci && npm run dev

# 4) Firmware dev (USB connected board)
cd firmware && pio run -t upload && pio device monitor
```

---

# 13) OTA process (dev)

1. Build firmware: `pio run` → artifact at `.pio/build/esp32dev/firmware.bin`
2. Upload via backend `POST /api/v1/ota/firmware` (stores in MinIO, computes SHA256, version e.g., `1.0.3`).
3. Schedule: `POST /api/v1/ota/schedule { device_id, version }` → backend publishes MQTT `devices/<id>/ota`.
4. Device receives message, fetches `url` by HTTPS, validates hash/signature, applies, posts status.

Document the above in `docs/OTA.md`.

---

# 14) Data dictionary (minimum fields)

Maintain in `docs/DATA_DICTIONARY.md`. Key runtime payloads:

**GNSS telemetry**

```json
{
  "ts":"ISO-8601",
  "lat": 22.3001,
  "lon": 114.1747,
  "hdop": 0.9,
  "speed": 0.5,
  "fix_age": 0.7
}
```

**BLE scan sample**

```json
{ "ts":"ISO-8601", "beacon_id":"bcn-2F-101", "rssi": -67 }
```

**Event**

```json
{ "ts":"ISO-8601", "type":"fall", "confidence":0.86, "details":{ ... } }
```

---

# 15) Minimal API contracts

* `POST /api/v1/telemetry/gnss/{deviceId}` → body: GNSS telemetry (HTTP fallback)
* `POST /api/v1/telemetry/ble/{deviceId}`  → body: BLE sample array (HTTP fallback)
* `GET /api/v1/residents`, `POST /api/v1/residents` …
* `GET /api/v1/devices`, `POST /api/v1/devices/bind`
* `GET /api/v1/events?type=fall|sos|geofence`
* `GET /api/v1/push/vapid` → return public key
* `POST /api/v1/push/subscribe` → store endpoint (per user)
* `POST /api/v1/ota/firmware` (admin), `POST /api/v1/ota/schedule` (admin)

All endpoints require JWT with role-based authorization except public `GET /healthz` and `GET /api/v1/push/vapid`.

---

# 16) Optional edge mode (Raspberry Pi)

Provide a `docker-compose.edge.yml` that runs Mosquitto + Backend + DB on a Pi for field demos. Use the same images (arm64 compatible) and switch environment variables to the Pi’s IP; watches point to the Pi’s MQTT.

---

# 17) Documentation & diagrams

* Put the final Mermaid architecture in `docs/SYSTEM_DESIGN.md`
* Add **sequence diagrams** for: fall alert, SOS, OTA update
* Enable GitHub Pages with mkdocs or Docusaurus to publish `/docs`

---

# 18) Final checklist (matches proposal)

* [x] **Wi-Fi only** transport; phone hotspot for outdoor simulation
* [x] **GNSS (ATGM336H) on watch**, BLE beacons (watch scans), MQTT/TLS 8883
* [x] **PWA + Web Push**, no native mobile app
* [x] **Backend**: API/Auth/RBAC/Geofence/Analytics/OTA; DB split for telemetry & events
* [x] **MQTT topics** and **downlink via broker** (no direct REST push)
* [x] **OTA** end-to-end path documented
* [x] **CI** for firmware/backend/frontend/AI; CodeQL; Dependabot
* [x] **Secrets** and **branch protections** set
* [x] **Project board / milestones** aligned to schedule.png

---

## One-shot instructions for Codex

1. **Create repo** `smart-elderly-care-fyp` (private), default branch `main`, protection as above; add teams; set CODEOWNERS.
2. **Generate monorepo tree** exactly as in section 1.
3. Add all example files and YAMLs provided (compose, workflows, requirements, package.json, platformio.ini, SQL schema, configs).
4. Run `mkcert` script and start local stack (`docker compose -f infra/docker-compose.dev.yml up -d --build`).
5. Scaffold backend endpoints and models; wire MQTT bridge; expose `/healthz`.
6. Scaffold PWA with Vite; add service worker, manifest, and push subscription using `VITE_VAPID_PUBLIC_KEY`.
7. Scaffold firmware main loop (Wi-Fi connect, BLE scan, GNSS read, MQTT publish, SOS, OTA).
8. Commit all; open PR to `dev`; after CI passes, merge to `main`.
9. Create milestones from schedule.png, labels, issue templates; open initial issues per module (firmware connectivity, GNSS parser, BLE scanning, MQTT topics, backend auth/RBAC, geofence CRUD, PWA push, OTA pipeline).
10. Document everything in `/docs` (copy the System Design, API, Data Dictionary, OTA). Publish docs via GitHub Pages (optional).

---
