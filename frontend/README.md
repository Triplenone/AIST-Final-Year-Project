# SmartCare React Frontend – Proactive Guardian Care

> This `frontend/` folder hosts the **React + Vite + TypeScript** dashboard that connects directly to the FastAPI backend and replaces the old “future PWA” / pure SSE simulator concept.

## English

### What this app is
- Tech stack: **Vite 5 + React 18 + TypeScript 5**, with ESLint configured (see `package.json`, `vite.config.ts`, `tsconfig.json`).
- Domain focus: “**Proactive Guardian Care – Smart Wearable Safety System for Elderly Homes**” with a residents overview, alerts/insights, and an Admin area mapped to your MySQL schema.
- Data source: real data comes from the **FastAPI backend** (`backend/backend/app`), exposed under `/api/v1/*` (e.g. `/api/v1/residents`, `/api/v1/users`).
- i18n: three languages (**English / 繁體中文 / 简体中文**) powered by `i18next` + `react-i18next` (`src/i18n.ts`, `src/locales/**/translation.json`).
- Residents & KPIs: the main residents section shows live status/vitals and is backed by the backend `/api/v1/residents` aggregation.

> For step‑by‑step backend wiring in Chinese, see `frontend/guide.md`.

### How to run (with backend)
1. **Start the backend** (summary; follow backend docs for details):
   - Ensure MySQL has the `smart_elderly_care_system` DB (for example from `backend/Dump20251120.sql`).
   - Start FastAPI (e.g. `cd backend/backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`).
   - Backend base: `http://localhost:8000`, API prefix: `/api/v1`.
2. **Configure frontend backend URL** in `src/constants/backend.ts`:
   ```ts
   export const BACKEND_BASE_URL = 'http://localhost:8000';
   export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;
   ```
3. **Install and run frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev              # default port 5173
   ```
4. Open `http://localhost:5173`:
   - The Residents section should load residents from `/api/v1/residents`.
   - The Admin section should show Users/Devices/Locations/Events/User Status/Device Logs/Residents/KPI backed by `/api/v1/*`.

### Main frontend modules
- `src/App.tsx` – main dashboard layout (header, navigation, hero, metrics, residents, alerts/insights, `AdminSection`, auth modal).
- `src/i18n.ts` + `src/locales/**/translation.json` – i18n setup, including:
  - `layout.title` / `layout.subtitle` = “Proactive Guardian Care / Smart Wearable Safety System for Elderly Homes”.
  - `residents.*` and `admin.*` strings for the main residents view and Admin area.
- `src/constants/backend.ts` – backend base URL and API prefix.
- `src/types/backend.ts` – TypeScript interfaces aligned with FastAPI / MySQL (users, devices, events, locations, user_status, device_data_log, residents, kpi_metrics).
- `src/services/api.ts` – Axios client for all `/api/v1/*` endpoints.
- `src/adapters/residents.ts` – maps backend `ResidentResponse` → internal `Resident` model used by the dashboard.
- `src/hooks/useBackendResidentSnapshot.ts` – helper hook to fetch residents from `/api/v1/residents`.
- `src/shared/resident-live-store.tsx` – global residents store that hydrates from the backend (polling today, extendable to SSE).
- `src/components/admin/*` – Admin CRUD pages mapped to backend resources.

### Residents vs Admin Residents
- **Main Residents section** (`#residents` in `App.tsx`):
  - Shows the Proactive Guardian Care branding and residents filters (Stable / Follow-up / High).
  - Uses i18n strings under `residents.*` for titles, table headers, statuses and messages.
  - Reads from the shared resident store, which uses backend data when configured.
- **Admin Residents** (`src/components/admin/ResidentsAdmin.tsx`):
  - Acts as the **Resident Directory** under Admin → Residents.
  - Fetches `/api/v1/residents` via `residentApi.list`.
  - Shows ID, name, room, status (with colored pills), last seen, vitals summary and device info.
  - Provides search (name/room), status filtering, manual refresh and “updated at” timestamp.
  - Fully localized through `admin.residents.*` and `residents.status.*` keys.

### i18n & language switching
- `LanguageSwitcher` (`src/components/LanguageSwitcher.tsx`) toggles between:
  - `en` – English
  - `zh-HK` – 繁體中文
  - `zh-CN` – 简体中文
- Changing the language applies to:
  - Header branding and navigation (`layout.*`).
  - Residents overview (`residents.*`).
  - Admin tabs and Resident Directory (`admin.tabs.*`, `admin.residents.*`).
  - Auth copy, metrics, alerts, insights, etc.

### Build & preview
- Production build:
  ```bash
  npm run build
  npm run preview
  ```
- Output is in `dist/`. Serve it behind any static server that can talk to your backend (`BACKEND_BASE_URL`).

### Relationship with `frontend/web-dashboard`
- `frontend/web-dashboard/` remains the **legacy static dashboard** using a frontend‑only SSE simulator (no real backend).
- This `frontend/` React app is the main UI for:
  - Connecting to real backend data.
  - Demonstrating Admin CRUD mapped to the MySQL schema.
  - Presenting the Proactive Guardian Care branding and full i18n.

---

## 中文（繁體）

### 這個前端在做什麼
- 技術堆疊：**Vite 5 + React 18 + TypeScript 5**，已設定 ESLint。
- 主題：品牌與說明文字是「**Proactive Guardian Care – Smart Wearable Safety System for Elderly Homes**」，對應長者院舍智慧穿戴安全系統。
- 資料來源：直接串接 FastAPI 後端 `/api/v1/*`，例如 `/residents`、`/users`、`/devices` 等，底層使用 MySQL `smart_elderly_care_system`。
- 多語系：支援英文 / 繁體 / 簡體，語言設定在 `src/i18n.ts`，文字在 `src/locales/**/translation.json`。
- 首頁 Residents 區塊與 Alerts/Insights/KPI 都建立在同一份住民資料之上。

### 執行方式（配合後端）
1. 依照後端說明啟動 FastAPI 與 MySQL（可先匯入 `backend/Dump20251120.sql`）。
2. 在 `src/constants/backend.ts` 設定正確的後端網址/port。
3. 在 `frontend/` 目錄執行：
   ```bash
   npm install
   npm run dev
   ```
4. 開啟 `http://localhost:5173`：
   - Residents 區塊應顯示資料庫裡的住民。
   - Admin 區塊各頁面可透過 `/api/v1/*` 查詢與管理資料。

### Admin Resident Directory
- Admin 區塊由 `src/components/admin/AdminSection.tsx` 控制分頁，標籤文字全部走 i18n。
- `ResidentsAdmin` 會：
  - 呼叫 `/api/v1/residents` 取得住民聚合資訊。
  - 顯示 ID / 姓名 / 房號 / 狀態 / 最後出現 / 生命徵象 / 相關裝置。
  - 支援關鍵字搜尋與狀態篩選，以及「重新整理」與「更新於」時間。
  - 三語同步，與首頁住民狀態用字一致。

### 與 `frontend/web-dashboard` 的差異
- `web-dashboard`：純前端靜態儀表板（不依賴此後端），適合在沒有後端的 Demo 場景。
- `frontend`：與後端、資料庫、論文/專題整合的主系統，建議未來簡報與文件都以此為主。

更詳細的後端整合說明請參考 `frontend/README.backend-integration.md` 與 `frontend/guide.md`。
