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

### What’s New (2025-02)
- Responsive header keeps the SmartCare brand/tagline, nav, and auth controls readable on every breakpoint.
- Resident directory supports full-field editing, admin delete with confirmation, and inline status chips that never overlap.
- Simulator controls are now embedded above the resident table with start/stop streaming, manual/auto refresh, spawn/burst/mutate/clear, and custom resident creation.
- Service worker adds `/sim/snapshot`, `clearAll`, and `addCustom` so the React PWA, tests, and future backend APIs share the same contract.

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

### Quick Start (Monorepo)
1. Clone the repo and choose a module to run.
2. Frontend PWA (React + Vite)
   ```bash
   cd frontend
   npm install
   npm run dev -- --host   # http://localhost:5173
   ```
   - LIVE residents stream via the service worker (no backend) with `/sim/snapshot` fallback + manual refresh controls.
   - Sample accounts: `guest_demo/guest123`, `care_demo/care1234`, `admin_master/admin888`.
   - Admins manage the inline simulator panel: start/stop streaming, adjust refresh intervals, spawn/burst/mutate/clear rosters, add custom residents, and delete any entry.
3. Legacy static dashboard
   ```bash
   cd frontend/web-dashboard
   python -m http.server 5500   # http://localhost:5500
   ```
   Refresh once after the first load so the service worker takes control.
4. Backend (FastAPI skeleton)
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload   # http://localhost:8000/healthz
   ```
5. Full dev stack (docker-compose)
   ```bash
   cd infra
   ./mkcert-dev-certs.sh               # once per machine
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

---

## Frontend PWA Feature Guide (Overview)

- Live SSE stream at `/sim/sse` plus `/sim/snapshot` REST fallback keeps data fresh even when streaming is paused.
- Responsive header: SmartCare brand/tagline, nav links, language switcher, and auth controls stay aligned across breakpoints.
- Resident directory: filterable table with full-field editing, admin delete with confirmation, and status chips that never overlap.
- Inline simulator controls (admin only): start/stop streaming, manual refresh, configurable auto-refresh interval, spawn/burst/mutate, clear dynamic/all residents, and add custom residents via a form.
- KPI cards (Wellbeing, Alerts Resolved, Response Time), Recent Alerts, and Care Insights re-derive instantly from the shared resident store after every edit, deletion, or simulator action.

See `frontend/README.md` for detailed developer docs, simulator protocol, i18n, and layout rules.

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

### 最新亮點（2025-02）
- 響應式頁首：品牌標誌、標語、導覽列表與登入資訊在桌機與平板皆維持穩定版面。
- 住民名冊：可編輯所有欄位並對任何住民執行刪除，刪除前會跳出模擬資料確認訊息。
- 模擬器控制：整合於住民區塊上方，可啟停串流、手動/自動刷新、連發/新增/清空、輸入自訂住民。
- Service Worker 新增 `/sim/snapshot`、`clearAll`、`addCustom`，確保 React PWA、測試與未來後端 API 行為一致。

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
2. **React PWA（Vite）**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host   # http://localhost:5173
   ```
   - 內建 Service Worker SSE，亦提供 `/sim/snapshot` 手動刷新與自訂住民表單。
   - 測試帳號：`guest_demo/guest123`、`care_demo/care1234`、`admin_master/admin888`。
3. **儀表板 Demo**
   ```bash
   cd frontend/web-dashboard
   python -m http.server 5500
   ```
   連至 `http://localhost:5500`（Ctrl+F5）。Admin：`Admin/admin`；Caregiver：`Ms.Testing/admin`。
4. **後端骨架**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
   健康檢查：`http://localhost:8000/healthz`。
5. **完整開發堆疊**
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

### 前端 PWA 功能概覽

- Service Worker SSE (`/sim/sse`) 搭配 `/sim/snapshot` REST 備援，即使暫停串流依舊能手動刷新。
- 新版頁首確保 SmartCare 品牌、導覽與登入資訊在各種解析度皆保持整齊。
- 住民名冊可編輯姓名／房號／狀態／最後巡房資訊，並提供管理員刪除與確認流程。
- 模擬器控制（僅限管理員）整合啟停串流、手動刷新、自動刷新間隔、連發/新增、清除動態或全體住民，以及自訂住民表單。
- KPI 卡、最新警報、照護洞察皆即時重新推導，確保任何編輯或模擬器操作立刻反映。
