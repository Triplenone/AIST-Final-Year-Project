# Smart Elderly Care Platform Monorepo

## English Version
This monorepo captures the full SmartCare wearable ecosystem (firmware → MQTT → backend → frontend → AI → infra). Every module is scaffolded so teams can implement features without guessing folder structures or contracts. The legacy static dashboard is production-ready; other components are shells wired to match the proposal playbook.

### Architecture Snapshot
- **Wearable (firmware/)**: ESP32 + Wi-Fi transport, BLE beacons, GNSS, MQTT/TLS uplink, OTA receivers.
- **Backend (backend/)**: FastAPI control plane with planned routers for residents/devices/events/telemetry/push/ota.
- **Frontend (frontend/)**: Today’s demo lives at `frontend/web-dashboard`; a Vite + React PWA shell waits under `frontend/`.
- **AI (ai/)**: Workspace for notebooks and inference services.
- **Infrastructure (infra/)**: Mosquitto, TimescaleDB, MinIO, backend, and frontend brought up via docker-compose.
- **Testing (tests-e2e/)**: Placeholder for Cypress/Playwright/k6 suites.
- **Documentation (docs/)**: System design, API, data dictionary, OTA, security references.

### Repository Layout
| Path | Status | Description |
|------|--------|-------------|
| `frontend/web-dashboard` | ✅ Live | Static dashboard (auth, CRUD, staffing, messaging, i18n, export). |
| `frontend/` | 🟡 Scaffold | Vite + React PWA shell ready for migration. |
| `backend/` | 🟡 Scaffold | FastAPI structure with requirements and `/healthz`. |
| `firmware/` | 🟡 Scaffold | PlatformIO project for ESP32 wearable. |
| `ai/` | 🟡 Scaffold | Notebooks + inference service placeholder. |
| `infra/` | 🟡 Scaffold | docker-compose (Mosquitto, Timescale, MinIO, backend, frontend). |
| `tests-e2e/` | 🟡 Placeholder | Reserved for Cypress/Playwright/k6. |
| `docs/` | 🟡 Scaffold | Professional documentation set. |
| `.github/` | 🟡 Scaffold | CI stubs, templates, CODEOWNERS. |

### Runbook
1. **Clone** the repo and install tooling per module.
2. **Dashboard demo**
   ```bash
   
   python -m http.server 5500
   `cd frontend/web-dashboard``
   Visit `http://localhost:5500` (Ctrl+F5). Admin login: `Admin/admin`. Caregiver: `Ms.Testing/admin`.
3. **Backend shell**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
   Health probe: `http://localhost:8000/healthz`.
4. **Full dev stack**
   ```bash
   cd infra
   ./mkcert-dev-certs.sh   # once per machine
   docker compose -f docker-compose.dev.yml up --build
   ```

### Governance
- Default branch: `main` (protected). Daily integration branch: `dev`.
- Naming: `feat/<area>-<desc>`, `hotfix/<ticket>-<desc>`.
- CODEOWNERS enforce module review. CI hooks exist for future lint/test/build gates.

### Roadmap
1. Configure GitHub settings (branch protection, labels, projects, milestones).
2. Flesh out FastAPI routers and Alembic migrations.
3. Port dashboard features into the React PWA with Web Push.
4. Implement firmware Wi-Fi/BLE/GNSS/MQTT/TLS/OTA logic.
5. Keep `docs/` synchronized with implemented APIs/data.

## 繁體中文（香港）版本
此 Monorepo 覆蓋整個 SmartCare 穿戴式生態（韌體 → MQTT → 後端 → 前端 → AI → 基礎設施）。所有模組皆已依提案骨架配置，團隊可直接擴充而不必猜測結構。目前僅靜態儀表板可直接展示，其餘模組為待開發骨架。

### 系統架構速覽
- **穿戴端（firmware/）**：ESP32 + Wi-Fi 傳輸、BLE Beacon、GNSS、MQTT/TLS 上報、OTA 接收。
- **後端（backend/）**：FastAPI 控制層，規劃 residents/devices/events/telemetry/push/ota Router。
- **前端（frontend/）**：現有 Demo 位於 `frontend/web-dashboard`，`frontend/` 為 Vite + React PWA 殼。
- **AI（ai/）**：Notebook 與推論服務工作區。
- **基礎設施（infra/）**：利用 docker-compose 啟動 Mosquitto、TimescaleDB、MinIO、後端、前端。
- **測試（tests-e2e/）**：保留給 Cypress/Playwright/k6。
- **文件（docs/）**：系統設計、API、資料字典、OTA、安全參考。

### 目錄概況
| 路徑 | 狀態 | 說明 |
|------|------|------|
| `frontend/web-dashboard` | ✅ 已上線 | 靜態儀表板（登入、CRUD、人力、訊息、i18n、匯出）。 |
| `frontend/` | 🟡 骨架 | Vite + React PWA 外殼。 |
| `backend/` | 🟡 骨架 | FastAPI 架構與 `/healthz`。 |
| `firmware/` | 🟡 骨架 | ESP32 PlatformIO 專案。 |
| `ai/` | 🟡 骨架 | Notebook 與推論服務。 |
| `infra/` | 🟡 骨架 | docker-compose：Mosquitto、Timescale、MinIO、後端、前端。 |
| `tests-e2e/` | 🟡 保留 | Cypress/Playwright/k6 測試。 |
| `docs/` | 🟡 骨架 | 專業文件集合。 |
| `.github/` | 🟡 骨架 | CI 範本、模板、CODEOWNERS。 |

### 執行步驟
1. **Clone** 並安裝各模組需求。
2. **儀表板 Demo**
   ```bash
   cd frontend/web-dashboard
   python -m http.server 5500
   ```
   連至 `http://localhost:5500`（Ctrl+F5）。Admin：`Admin/admin`；Caregiver：`Ms.Testing/admin`。
3. **後端骨架**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
   健康檢查：`http://localhost:8000/healthz`。
4. **完整開發堆疊**
   ```bash
   cd infra
   ./mkcert-dev-certs.sh   # 每台機器一次
   docker compose -f docker-compose.dev.yml up --build
   ```

### 治理原則
- 預設分支 `main`（受保護），日常整合 `dev`。
- 分支命名：`feat/<領域>-<描述>`、`hotfix/<票號>-<描述>`。
- CODEOWNERS 強制模組審查；CI 鉤子待實裝 lint/test/build。

### 路線圖
1. 完成 GitHub 設定（分支保護、標籤、專案、里程碑）。
2. 擴寫 FastAPI Router 與 Alembic 遷移。
3. 將儀表板功能遷移至 React PWA，並加入 Web Push。
4. 在韌體端實作 Wi-Fi/BLE/GNSS/MQTT/TLS/OTA。
5. 持續同步 `docs/` 與已完成的 API/資料。
