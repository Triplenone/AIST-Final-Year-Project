# Infrastructure (scaffold / not verified end-to-end)

This folder contains **docker-compose scaffolding** and TLS helper scripts for a future “full stack” environment.

## What exists (repo evidence)

| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Defines MQTT (Mosquitto), a Postgres/Timescale DB, MinIO, a frontend container, and a backend build stub. |
| `mkcert-dev-certs.sh` | Generates Mosquitto TLS certs using `mkcert`. |
| `mosquitto/mosquitto.conf` | Mosquitto listeners/config. |
| `sql/000_init.sql` | Placeholder SQL. |

## Not verified / mismatches (repo evidence)

- **Not found**: any `Dockerfile` in the repo → `docker-compose.dev.yml` has `backend: build: ../backend`, but there is no Dockerfile under `backend/`.
- **DB mismatch**: compose uses Postgres/Timescale, but the implemented backend uses **MySQL** (`backend/backend/app/config.py` → `mysql+pymysql://...`).
- **Env mismatch**: compose sets `DATABASE_URL`, but the backend reads `DB_HOST`, `DB_USER`, etc (see `backend/backend/app/config.py`).
- **Not implemented**: backend `/sim/*` endpoints (the primary UI polls `/api/v1/*`).

## Optional (scaffold) commands

These commands exist in this folder, but the stack is **not expected to run end-to-end** until the mismatches above are addressed:

```bash
cd infra
./mkcert-dev-certs.sh
docker compose -f docker-compose.dev.yml up --build
```

## How to make this runnable (next steps)

- Add a backend `Dockerfile` (and decide how to provide DB config inside the container).
- Choose one DB path:
  - Update backend to accept `DATABASE_URL` + Postgres, or
  - Update compose to run MySQL and pass `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`.
