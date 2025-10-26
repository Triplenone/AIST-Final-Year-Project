# Backend Skeleton

## English Version
The backend directory houses the FastAPI control plane that will front MQTT telemetry, REST APIs, OTA orchestration, and RBAC enforcement. The current code only exposes `/healthz`, but the folder layout (api/services/models/auth/db/workers) matches the architecture playbook for easy expansion.

### Tech Stack
- FastAPI 0.115, Uvicorn 0.30.
- SQLAlchemy 2 + Timescale/Postgres + Alembic migrations.
- MQTT bridge via `paho-mqtt` / `asyncio-mqtt`.
- JWT auth using `python-jose`; password hashing with `passlib[bcrypt]`.
- Web push with `pywebpush`; MinIO SDK for artifact storage.

### Getting Started
```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --reload
```
Add routers under `app/api/v1/`, register them in `app/main.py`, and expose dependencies (DB session, auth) via FastAPI `Depends`.

### Roadmap
1. Implement `/api/v1/residents`, `/devices`, `/events`, `/telemetry`, `/push`, `/ota` routers with OpenAPI schemas.
2. Add ORM models + Alembic migrations; seed reference data using `infra/sql`.
3. Connect MQTT workers for telemetry ingestion and OTA fan-out.
4. Implement JWT issuance/refresh + RBAC integration with the dashboard.
5. Add pytest + httpx tests and CodeQL/CI workflows.

## 繁體中文（香港）版本
`backend/` 目錄負責 FastAPI 控制層，用以承接 MQTT 遙測、REST API、OTA 排程與 RBAC。現階段僅提供 `/healthz`，但資料夾結構（api/services/models/auth/db/workers）已對應架構藍圖，可直接擴充。

### 技術堆疊
- FastAPI 0.115、Uvicorn 0.30。
- SQLAlchemy 2 + Timescale/Postgres + Alembic 遷移。
- 透過 `paho-mqtt` / `asyncio-mqtt` 建立 MQTT 橋接。
- 使用 `python-jose` 發行 JWT，`passlib[bcrypt]` 進行密碼雜湊。
- `pywebpush` 推播，`minio` 套件管理檔案儲存。

### 快速開始
```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --reload
```
在 `app/api/v1/` 新增 Router，於 `app/main.py` 註冊，並透過 FastAPI `Depends` 注入資料庫與認證依賴。

### 路線圖
1. 實作 `/api/v1/residents`、`/devices`、`/events`、`/telemetry`、`/push`、`/ota` Router 與 OpenAPI Schema。
2. 建立 ORM Model 與 Alembic 遷移，並使用 `infra/sql` 初始化資料。
3. 接上 MQTT Worker 處理遙測與 OTA 廣播。
4. 實作 JWT 簽發/刷新與 RBAC，與前端儀表板整合。
5. 加入 pytest + httpx 測試，以及 CodeQL/CI 工作流程。
