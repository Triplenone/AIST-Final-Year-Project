# Backend Skeleton / 後端骨架

- Framework: FastAPI + Pydantic + SQLAlchemy (see `requirements.txt`).
- MQTT bridge, RBAC, geofence analytics, OTA endpoints are pending implementation.
- Keep modular layout under `app/` (api/services/models/auth/db/workers).

Future steps:
1. Wire `infra/docker-compose.dev.yml` services (Postgres/Timescale, Mosquitto, MinIO).
2. Implement `/api/v1/residents`, `/api/v1/devices`, `/api/v1/events`, `/api/v1/telemetry`, `/api/v1/push`, `/api/v1/ota` routers.
3. Add Alembic migrations in `app/db/migrations`.
4. Connect MQTT bridge for telemetry uplink + command downlink.

繁體中文：此資料夾目前只有 FastAPI 空殼，請依提案逐步建立 REST/MQTT 功能，並記錄在 `docs/API.md`。
