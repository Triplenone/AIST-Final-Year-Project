# Frontend Documentation

## 中文說明

### 目的
`frontend/` 是目前倉庫中唯一仍然有效且受支援的前端實作。這是一個以 React + Vite + TypeScript 建立的單頁應用，直接對接 FastAPI backend 的 `/api/v1/*` 端點，負責總覽、住戶資料、位置地圖、警報、通知與管理介面。

本 README 是目前前端的主文件。`README.backend-integration.md` 與 `guide.md` 仍可作為歷史補充，但若內容與本文件衝突，請以本文件與實際程式碼為準。

### English Overview
`frontend/` is the only active and supported frontend in this repository. It is a React + Vite + TypeScript single-page application that talks directly to the FastAPI backend under `/api/v1/*` and owns the overview dashboard, resident views, location map, alerts, notifications, and admin tools.

This README is the canonical frontend handover document. `README.backend-integration.md` and `guide.md` still exist as supplemental notes, but whenever they differ from current code, this file and the source tree are authoritative.

### 技術棧 / Tech Stack
- React 18
- Vite 5
- TypeScript 5
- Axios
- i18next + react-i18next + browser language detector
- Leaflet + react-leaflet
- Recharts
- Playwright
- Vitest

### 目錄概覽 / Directory Overview

| 路徑 | 說明 |
| --- | --- |
| `public/` | 直接由 Vite 複製的靜態資產，包含室內地圖圖片與 Push service worker。 |
| `src/` | 真正的執行時程式碼。 |
| `src/components/` | 儀表板、警報、通知、語言切換、地圖與管理 UI。 |
| `src/components/admin/` | 後台 CRUD 面板，直接對應 backend 資源。 |
| `src/components/charts/` | 住戶摘要圖表與 IMU 波形圖。 |
| `src/adapters/` | 將 backend DTO 轉成 UI model 的轉接層。 |
| `src/services/` | 唯一的 HTTP API 邊界。 |
| `src/shared/` | 應用層共享狀態，目前只有住戶 live store。 |
| `src/hooks/` | 可重用資料抓取 hook，目前只保留事件輪詢 hook。 |
| `src/types/` | backend DTO 與 UI resident model。 |
| `src/utils/` | 指標推導與 geofence 座標解析。 |
| `src/locales/` | 英文、繁中、簡中的翻譯字典。 |
| `tests/` | Playwright UI / integration 測試。 |

### 目前前端已完成什麼 / What the current frontend already does
- 透過 `ResidentLiveProvider` 定期抓取 `/api/v1/residents`，提供住戶快照。
- 在 `App.tsx` 內組合總覽、住戶預覽、KPI、圖表、位置地圖、即時警報、推播與後台。
- 透過 `useBackendEvents` 輪詢事件，供警報面板、緊急彈窗與 geofence 區塊共用。
- 透過 `LocationDashboard` 呈現室內平面圖與室外 geofence 事件。
- 透過 `PushNotificationPanel` 完成 Web Push 訂閱、取消與測試通知。
- 透過 `components/admin/*` 直接 CRUD backend 的使用者、裝置、位置、事件、裝置日誌、住戶聚合、user status 與 KPI。

### 尚未完成或仍有技術債 / What is unfinished or still rough
- 大部分 admin 面板尚未全面接入 i18n，且部分字串仍有舊編碼殘留。
- `ImuWaveformChart` 在 API 無資料或失敗時會退回 fallback 訊號，這有利 demo，但會掩蓋真實資料缺口。
- `useBackendEvents` 仍用輪詢，不是 SSE 或 WebSocket。
- 整個專案以單一 `api.ts` 管理所有 API family，規模再擴大時會需要拆分。
- `LocationDashboard` 同時承擔資料抓取、地圖繪製、geofence 處理與佔用資訊顯示，功能偏重。

### 啟動方式 / Local Startup

```bash
cd frontend
npm install
npm run dev
```

預設 Vite 開在 `http://localhost:5173`。  
`src/constants/backend.ts` 會使用目前頁面的 hostname，自動把 backend 指向同主機的 `:8000`。

若要搭配 backend 一起跑，典型流程是：

```bash
cd backend/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd ../../frontend
npm run dev
```

### 主要頁面與模組 / Main Screens and Modules
- `src/main.tsx`
  - 掛載 `ResidentLiveProvider`，並在 `Suspense` 內渲染整個 app。
- `src/App.tsx`
  - 單頁殼層與段落組裝點。
  - 持有 theme、derived metrics、chart data、insights 等頁面級狀態。
  - 透過 URL query `?capture=location` 輸出只含地圖的畫面。
- `src/components/LocationDashboard.tsx`
  - 讀取位置資料與 geofence 事件，渲染 indoor / outdoor 地圖。
- `src/components/BackendAlertsPanel.tsx`
  - 顯示後端事件流，支援 acknowledge / resolve / false alarm。
- `src/components/EmergencyAlertModal.tsx`
  - 從高優先級 active events 中挑一筆，顯示全螢幕緊急彈窗。
- `src/components/PushNotificationPanel.tsx`
  - 註冊 `public/push-sw.js`，並透過 push subscription API 管理訂閱。
- `src/components/admin/*`
  - 後台各資源的 CRUD 面板。
- `src/components/charts/*`
  - KPI 圖表與 IMU 六軸波形圖。

### 工作流 / Workflow
1. `main.tsx` 載入 `i18n`、Leaflet CSS 與 `ResidentLiveProvider`。
2. `ResidentLiveProvider` 在 mount 時呼叫 `residentApi.list({ limit: 500 })`，之後每 10 秒刷新一次。
3. `src/adapters/residents.ts` 將 backend resident payload 轉為 UI `Resident` model。
4. `App.tsx` 從 live store 取值，計算 metrics、status pie data、zone bar data、alert trend 與 insight list。
5. `LocationDashboard` 另外抓 `/locations` 與 `/events`，不依賴 resident live store 提供 geofence shape。
6. `BackendAlertsPanel` 與 `EmergencyAlertModal` 共享 `useBackendEvents` 的輪詢模式。
7. `PushNotificationPanel` 先讀 backend VAPID public key，再與 service worker 訂閱流程串接。
8. 管理面板直接呼叫對應 API family，變更後重新抓取最新資料。

### 資料流 / Data Flow
#### 住戶資料
`residentApi.list` -> `mapBackendResidents` -> `ResidentLiveProvider` context -> `App.tsx` 與地圖 / 警報 / 指標消費。

#### 事件資料
`eventApi.list` -> `useBackendEvents` -> `BackendAlertsPanel`、`EmergencyAlertModal`、`LocationDashboard` geofence 列表。

#### 位置資料
`locationApi.list` -> `LocationDashboard` -> `parseGeofenceCoordinates` / Leaflet polygon -> 地圖 overlay 與 occupancy panel。

#### 推播資料
`pushSubscriptionApi.getPublicKey` -> browser service worker + push manager -> `pushSubscriptionApi.subscribe/unsubscribe/test`。

#### IMU / 裝置日誌資料
`deviceDataLogApi.list` -> `ImuWaveformChart` -> Recharts line chart。

### 與 Backend 的互動方式 / Integration with Backend
- API base URL 由 `src/constants/backend.ts` 根據當前 hostname 推導為 `http(s)://<host>:8000/api/v1`。
- 所有前端 HTTP 呼叫都集中在 `src/services/api.ts`。
- `api.ts` 以 Axios instance 建立統一的 JSON header 與錯誤轉換邏輯。
- 目前涵蓋的 API family：
  - `userApi`
  - `deviceApi`
  - `locationApi`
  - `eventApi`
  - `userStatusApi`
  - `deviceDataLogApi`
  - `residentApi`
  - `dataReceptionApi`
  - `kpiApi`
  - `pushSubscriptionApi`

### 通知與警報流程 / Alerts and Notification Flow
1. `useBackendEvents` 週期性抓取事件。
2. `BackendAlertsPanel` 將事件依嚴重度排序並顯示最近六筆。
3. `EmergencyAlertModal` 從 active events 中挑最重要的一筆覆蓋在畫面上。
4. `PushNotificationPanel` 讓使用者向 backend 註冊 browser subscription。
5. `public/push-sw.js` 負責接收 push payload 並導回 `/#operations`。

### 圖表與即時資料顯示方式 / Charts and Real-time Presentation
- KPI 指標由 `deriveResidentMetrics` 從 resident snapshot 即時計算。
- 狀態分布、區域分布、六小時警報趨勢由 `App.tsx` 在記憶體中推導，不是 backend 預先聚合。
- `ImuWaveformChart` 直接抓裝置日誌並每 2 秒刷新。
- `LocationDashboard` 對 indoor 與 outdoor 採用不同地圖模式：
  - indoor 使用 `CRS.Simple` + floorplan image overlay。
  - outdoor 使用 OpenStreetMap tile layer。

### 多語系架構 / i18n Structure
- `src/i18n.ts` 在啟動時載入 `en`、`zh-HK`、`zh-CN`。
- 語言偵測順序：`localStorage` -> `htmlTag` -> `navigator`。
- `LanguageSwitcher` 只切換 `i18next` 語言，不自行管理文案。
- Playwright 測試會在 `beforeEach` 先把 `i18nextLng` 設成 `en`，避免多語造成 selector 不穩定。

### 測試方式 / Testing

```bash
cd frontend
npm run lint
npm run build
npm run test
npm run test:e2e
```

- `npm run test`
  - 走 Vitest。
  - 目前 `vite.config.ts` 設定會排除 `tests/ui/**`，且 `passWithNoTests: true`，表示目前沒有維護中的 unit test 套件。
- `npm run test:e2e`
  - 走 Playwright。
  - 預設 `baseURL` 為 `http://localhost:8000`，代表測試預期前端可以經由 backend host 被存取。
  - `tests/ui/helpers.ts` 會直接呼叫 backend API 建立或清空事件資料，因此測試環境必須可寫入。

### 近期改動 / Recent Changes
- 保留單一 React frontend，淘汰 `frontend/web-dashboard/` 的舊 dashboard 方案。
- 移除 `DevPanel`、`SimulatorControls`、`simulator-controls` service 與舊 `sse-sw.js`。
- 移除 `src/sse/client.ts` 與舊的 resident snapshot / resident editor hooks。
- 新增 `BackendAlertsPanel`、`EmergencyAlertModal`、`PushNotificationPanel`、`ImuWaveformChart`。
- 將 resident snapshot 主流程集中到 `ResidentLiveProvider`。
- 將 push notification 流程改為 browser service worker + backend push subscription API。

### 維護注意事項 / Maintenance Notes
- backend DTO 變更要先更新 `src/types/backend.ts`，再看是否需要改 `src/adapters/residents.ts`。
- 不要在元件內手刻 backend URL；統一走 `src/services/api.ts`。
- 若要調整 resident 顯示邏輯，先檢查 `resident-live-store.tsx`、`adapters/residents.ts`、`utils/resident-derived.ts` 的連動。
- 若要調整地圖 geofence 解析，先檢查 `utils/geo.ts` 的 indoor / geo mode。
- 若要改善 admin 文字品質，優先處理仍未 i18n 化且含舊編碼的面板。

### 目前限制 / Known Limitations
- Admin 介面存在 mixed-language 與舊編碼字串。
- 事件與住戶更新仍以 polling 為主，沒有真正的 server push stream。
- `ImuWaveformChart` 的 fallback waveform 是刻意保底，不代表 backend 健康。
- `LocationDashboard` 對室內位置只支援特定 zone name 白名單。
- `BackendResident` 型別中仍保留一些聚合欄位與重複欄位，映射邊界較鬆。

### 已移除或棄用項目 / Deprecated or Removed Items
- `frontend/web-dashboard/`：已淘汰，不再是活躍前端。
- `src/components/DevPanel.tsx`：已移除。
- `src/components/SimulatorControls.tsx`：已移除。
- `src/hooks/useBackendResidentSnapshot.ts`：已移除，由 `shared/resident-live-store.tsx` 接手。
- `src/hooks/useResidentEditor.ts`：已移除，表單狀態分散回各 admin component。
- `src/services/simulator-controls.ts`：已移除。
- `src/sse/client.ts`：已移除。
- `public/sse-sw.js`：已移除，現行僅保留 `push-sw.js`。

### 建議閱讀順序 / Suggested Reading Order
1. `src/main.tsx`
2. `src/App.tsx`
3. `src/shared/resident-live-store.tsx`
4. `src/services/api.ts`
5. `src/adapters/residents.ts`
6. `src/types/backend.ts`
7. `src/components/LocationDashboard.tsx`
8. `src/components/BackendAlertsPanel.tsx`
9. `src/components/EmergencyAlertModal.tsx`
10. `src/components/PushNotificationPanel.tsx`
11. `src/components/admin/`
12. `tests/ui/`

## English Overview

### Purpose
`frontend/` is the single supported frontend in the repository. It is a React + Vite + TypeScript application that consumes the FastAPI backend under `/api/v1/*` and renders the operational dashboard, resident snapshot, map views, alerts, notifications, and admin tools.

This README is the main handover document for the frontend. `README.backend-integration.md` and `guide.md` are still present as supplemental notes, but whenever they differ from the codebase, this file and the code should be treated as the current source of truth.

### Directory Overview
The important runtime directories are:
- `public/` for static assets copied by Vite as-is.
- `src/` for all runtime source code.
- `src/components/` for the dashboard UI and admin panels.
- `src/adapters/` for DTO mapping.
- `src/services/` for the centralized API layer.
- `src/shared/` for cross-app state.
- `src/hooks/` for reusable data fetching hooks.
- `src/types/` for backend and UI contracts.
- `src/utils/` for derived calculations and map geometry helpers.
- `src/locales/` for translation dictionaries.
- `tests/` for Playwright-based UI and integration coverage.

### What the current frontend already does
- Polls `/api/v1/residents` through `ResidentLiveProvider` and exposes a shared resident snapshot.
- Composes overview, residents, metrics, charts, location map, alerts, push notifications, and admin tools inside `App.tsx`.
- Polls backend events through `useBackendEvents` and reuses them across the alerts panel, emergency modal, and geofence display.
- Renders indoor floorplan and outdoor geofence views through `LocationDashboard`.
- Registers `public/push-sw.js` and manages browser push subscriptions through backend push endpoints.
- Exposes CRUD-style admin panels for users, devices, locations, events, device logs, residents, user status, and KPI records.

### What is unfinished or still rough
- Most admin panels are not fully internationalized yet, and some hard-coded strings still carry legacy encoding artifacts.
- `ImuWaveformChart` intentionally falls back to synthetic waveform data when the API is empty or fails; this is useful for demos but can hide real backend gaps.
- `useBackendEvents` is still polling-based rather than SSE or WebSocket based.
- The project still uses a single `api.ts` file for every API family; that will become harder to maintain as the surface grows.
- `LocationDashboard` currently owns data fetching, geofence parsing, map rendering, and occupancy rendering in one component.

### Local Startup
Run the frontend with:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app on `http://localhost:5173` by default.  
`src/constants/backend.ts` derives the backend host from the current browser hostname and always targets port `8000`.

When running with the backend, the normal flow is:

```bash
cd backend/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd ../../frontend
npm run dev
```

### Main screens and modules
- `src/main.tsx`
  - Bootstraps i18n, Leaflet CSS, and `ResidentLiveProvider`.
- `src/App.tsx`
  - Owns the page shell and top-level derived UI state.
  - Supports a `?capture=location` mode that renders only the location dashboard.
- `src/components/LocationDashboard.tsx`
  - Loads location zones and geofence events and renders indoor/outdoor maps.
- `src/components/BackendAlertsPanel.tsx`
  - Shows a prioritized slice of backend events with handling actions.
- `src/components/EmergencyAlertModal.tsx`
  - Promotes the highest-priority active event into a blocking overlay.
- `src/components/PushNotificationPanel.tsx`
  - Handles browser push subscription setup and test notifications.
- `src/components/admin/*`
  - Exposes backend CRUD interfaces.
- `src/components/charts/*`
  - Renders resident summary charts and the IMU waveform chart.

### Workflow
1. `main.tsx` loads i18n, mounts React, and wraps the app with `ResidentLiveProvider`.
2. `ResidentLiveProvider` fetches `/api/v1/residents` on mount and every 10 seconds afterward.
3. `src/adapters/residents.ts` converts backend resident payloads into the UI `Resident` shape.
4. `App.tsx` derives KPI numbers, chart series, and insight text from the shared resident snapshot.
5. `LocationDashboard` independently fetches `/locations` and `/events` for geofence rendering.
6. `BackendAlertsPanel` and `EmergencyAlertModal` reuse `useBackendEvents` for event polling.
7. `PushNotificationPanel` retrieves the backend VAPID key and completes the browser subscription flow.
8. Admin panels call their API family directly and reload after mutations.

### Data Flow
#### Resident data
`residentApi.list` -> `mapBackendResidents` -> `ResidentLiveProvider` context -> consumers in `App.tsx` and map/alert components.

#### Event data
`eventApi.list` -> `useBackendEvents` -> `BackendAlertsPanel`, `EmergencyAlertModal`, and the geofence sections in `LocationDashboard`.

#### Location data
`locationApi.list` -> `LocationDashboard` -> `parseGeofenceCoordinates` / Leaflet polygon rendering -> indoor and outdoor overlays.

#### Push data
`pushSubscriptionApi.getPublicKey` -> service worker + browser push manager -> `pushSubscriptionApi.subscribe/unsubscribe/test`.

#### IMU / device log data
`deviceDataLogApi.list` -> `ImuWaveformChart` -> Recharts line chart.

### Backend integration
- `src/constants/backend.ts` derives `http(s)://<host>:8000/api/v1`.
- All frontend HTTP traffic goes through `src/services/api.ts`.
- `api.ts` uses a shared Axios instance with JSON defaults and unified error normalization.
- The currently maintained API families are:
  - `userApi`
  - `deviceApi`
  - `locationApi`
  - `eventApi`
  - `userStatusApi`
  - `deviceDataLogApi`
  - `residentApi`
  - `dataReceptionApi`
  - `kpiApi`
  - `pushSubscriptionApi`

### Alerts and notification flow
1. `useBackendEvents` polls backend events.
2. `BackendAlertsPanel` sorts and renders the most relevant recent events.
3. `EmergencyAlertModal` selects the highest-priority active event and renders it as a blocking overlay.
4. `PushNotificationPanel` lets the browser register a subscription against backend push endpoints.
5. `public/push-sw.js` receives push payloads and routes users back to `/#operations`.

### Charts and real-time presentation
- KPI values are derived in memory through `deriveResidentMetrics`.
- Status distribution, zone distribution, and alert trend charts are computed in `App.tsx`, not pre-aggregated by the backend.
- `ImuWaveformChart` fetches device logs and refreshes every 2 seconds.
- `LocationDashboard` uses:
  - `CRS.Simple` + floorplan overlay for indoor maps.
  - OpenStreetMap tiles for outdoor geofence rendering.

### i18n structure
- `src/i18n.ts` loads `en`, `zh-HK`, and `zh-CN` resources at startup.
- Language detection order is `localStorage` -> `htmlTag` -> `navigator`.
- `LanguageSwitcher` only changes i18next state; it does not own any translation dictionaries.
- Playwright test setup forces `i18nextLng = en` to keep selectors stable.

### Testing

```bash
cd frontend
npm run lint
npm run build
npm run test
npm run test:e2e
```

- `npm run test`
  - Runs Vitest.
  - `vite.config.ts` excludes `tests/ui/**` and sets `passWithNoTests: true`, which means there is currently no maintained unit test suite under `src/`.
- `npm run test:e2e`
  - Runs Playwright.
  - The default `baseURL` is `http://localhost:8000`, so the tests assume the frontend is reachable from the backend host or a compatible deployment host.
  - `tests/ui/helpers.ts` actively mutates backend state, so the test target must be writable and disposable.

### Recent changes
- Consolidated the repo around one React frontend and retired the old `frontend/web-dashboard/` implementation.
- Removed `DevPanel`, `SimulatorControls`, the simulator control service, and the old `sse-sw.js`.
- Removed `src/sse/client.ts` and the older resident snapshot / resident editor hooks.
- Added `BackendAlertsPanel`, `EmergencyAlertModal`, `PushNotificationPanel`, and `ImuWaveformChart`.
- Centralized resident snapshot fetching in `ResidentLiveProvider`.
- Replaced prior push-related simulator flows with a real browser service worker plus backend push subscription endpoints.

### Maintenance notes
- Backend schema changes should start in `src/types/backend.ts`, then flow into `src/adapters/residents.ts` if the UI model changes.
- Do not build backend URLs inside components; route everything through `src/services/api.ts`.
- Resident display changes usually affect `resident-live-store.tsx`, `adapters/residents.ts`, and `utils/resident-derived.ts` together.
- Indoor/outdoor geofence behavior depends on `utils/geo.ts`; change parsing rules there before patching rendering logic.
- If you want to improve admin UX, the highest-value cleanup is to finish i18n and remove remaining mixed-encoding labels.

### Known limitations
- Admin UIs still contain mixed-language and legacy-encoding strings.
- Resident and event updates are polling-based rather than streaming.
- The IMU chart fallback waveform is intentional and should not be mistaken for a healthy backend.
- `LocationDashboard` only renders a known set of indoor zone names.
- `BackendResident` still includes several aggregated fields and a duplicated property declaration, so the type boundary is intentionally permissive.

### Deprecated or removed items
- `frontend/web-dashboard/`: retired and no longer part of the active product.
- `src/components/DevPanel.tsx`: removed.
- `src/components/SimulatorControls.tsx`: removed.
- `src/hooks/useBackendResidentSnapshot.ts`: removed and replaced by `shared/resident-live-store.tsx`.
- `src/hooks/useResidentEditor.ts`: removed; admin forms manage their own state locally now.
- `src/services/simulator-controls.ts`: removed.
- `src/sse/client.ts`: removed.
- `public/sse-sw.js`: removed; only `push-sw.js` remains active.

### Suggested reading order
1. `src/main.tsx`
2. `src/App.tsx`
3. `src/shared/resident-live-store.tsx`
4. `src/services/api.ts`
5. `src/adapters/residents.ts`
6. `src/types/backend.ts`
7. `src/components/LocationDashboard.tsx`
8. `src/components/BackendAlertsPanel.tsx`
9. `src/components/EmergencyAlertModal.tsx`
10. `src/components/PushNotificationPanel.tsx`
11. `src/components/admin/`
12. `tests/ui/`
