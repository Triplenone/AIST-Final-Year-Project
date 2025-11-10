# SmartCare Web Dashboard

## English

The legacy SmartCare dashboard is now refreshed with a soft yellow–green visual system, role-based authentication, and a built-in SSE simulator that works without a backend. All critical interactions remain frontend-only so you can run it locally on any machine.

### February 2025 Update
- The React PWA (`frontend/`) is now the primary playground: responsive header, inline simulator controls (spawn/burst/clear/clearAll/addCustom), start/stop streaming, manual snapshot refresh, and full admin deletion.
- Keep this legacy README for static demos, but align copy/fixtures with the React behaviour so handovers stay consistent.

### Quick Start
1. `cd frontend/web-dashboard`
2. Install dependencies only if you need the React playground (`npm install`), otherwise skip.
3. Choose a dev server:
   - **Option A: Vite (port 5173)** — `npm run dev -- --host`
   - **Option B: Static server (port 5500)** — `python -m http.server 5500`
4. Open `http://localhost:5173` or `http://localhost:5500`. Refresh once after the first load so the service worker takes control.
5. Sign in with one of the sample accounts:

| Role      | Username        | Password  | Notes                                    |
|-----------|-----------------|-----------|------------------------------------------|
| Guest     | `guest_demo`    | `guest123`| Read-only; can browse but cannot edit.   |
| Caregiver | `care_demo`     | `care1234`| Can edit residents and leave messages.   |
| Admin     | `admin_master`  | `admin888`| Unlocks simulator controls & staffing.   |

> Registering a new account (via the modal) lets you add more **guest** or **caregiver** users without touching this file. Admin accounts remain manual for safety.

### Feature Highlights
- **Role-aware UI**: The top bar shows who is logged in (Guest / Caregiver / Admin). Buttons disable gracefully for lower roles.
- **SSE + Service Worker simulator**: `/sw-sse.js` streams vitals on `/events` and exposes REST shims:
  - `POST /api/residents/random`
  - `POST /api/residents/random-batch`
  - `POST /api/residents/{id}/checkout`
  - `POST /api/residents/generated/clear`
- **Simulator controls** (Operations panel) — visible only to admins:
  - Add 1 random resident / Add 5 in bulk / Clear generated
  - Live connection badge mirrors SSE status (Firefox falls back to polling)
- **Dynamic KPIs**: Wellbeing, Alerts Resolved, and Average Response Time recompute whenever vitals change or residents are edited. Recent Alerts & Care Insights lists stay in sync with severity.
- **Design refresh**: Light theme uses sage + lemon gradients; Dark theme keeps high contrast. Residents table highlights risk bands, and the floating live feed panel tracks the latest 10 events.
- **Chinese commentary in source**: Key JS/worker logic include inline Traditional Chinese notes so teammates can follow the mock flow quickly.

### Verification Checklist
1. Load the dashboard as Guest → controls are disabled, Live Feed still streams vitals.
2. Login as Admin → simulator buttons become active; try “Add five residents” and watch KPIs update.
3. From DevTools: `await SSEMock.checkInOne()` or `await SSEMock.clearGenerated()` to trigger events manually.
4. Confirm only one long-lived `/events` request stays pending in the Network tab (Chromium/Safari). Firefox gracefully switches to `/api/vitals-feed`.
5. Compare `http://localhost:5173` (Vite) and `http://localhost:5500` (static) — the layout, theme toggle, and SSE behaviour match.

### Troubleshooting
- **Simulator offline**: Refresh once; the SW version bumps on every change (`swVersion = 'sse-mock-v2'`).
- **HTTPS warning**: Browsers require HTTPS for service workers. `localhost` is whitelisted, so keep the dev server on `localhost`.
- **Persisted data**: Everything lives in `localStorage`. Use DevTools Storage panel to reset if needed.

---

## 繁體中文

這份儀表板已換上淺黃綠色系，支援角色型登入與前端 SSE 模擬器，無需串接後端即可示範即時資料。所有程式邏輯仍純前端，可在任何開發環境快速啟動。

### 2025-02 更新
- React PWA（`frontend/`）已成主要示範版本：整合響應式頁首與模擬器控制（連發／清除／自訂）、啟停串流、手動 snapshot 刷新，以及完整的管理員刪除流程。
- 此 README 仍保留給靜態 Demo，但請在文案與測試資料上對齊 React 行為，確保交班體驗一致。

### 快速開始
1. `cd frontend/web-dashboard`
2. 若僅瀏覽靜態頁面可跳過安裝套件；若需 React 開發環境再執行 `npm install`。
3. 選擇開發伺服器：
   - **方案 A：Vite（5173 埠）** — `npm run dev -- --host`
   - **方案 B：Python 靜態伺服器（5500 埠）** — `python -m http.server 5500`
4. 開啟 `http://localhost:5173` 或 `http://localhost:5500`，兩者樣式一致。首次載入後請重新整理一次，讓 Service Worker 生效。
5. 使用以下測試帳號登入：

| 角色     | 帳號             | 密碼      | 備註                             |
|----------|------------------|-----------|----------------------------------|
| 訪客     | `guest_demo`     | `guest123`| 僅瀏覽，無法編輯資料             |
| 照顧員   | `care_demo`      | `care1234`| 可編輯住民/留言                  |
| 管理員   | `admin_master`   | `admin888`| 可操作模擬器與人力設定           |

> Modal 註冊流程可新增 **訪客** 或 **照顧員**，管理員帳號仍由 README 管理以確保安全。

### 功能亮點
- **角色感知介面**：頂部顯示登入者角色並自動調整按鈕啟用狀態。
- **SSE 模擬器 + Service Worker**：`/sw-sse.js` 在 `/events` 推送資料，並提供 REST 模擬端點（見上表）。Firefox 會自動回退至 `/api/vitals-feed` 輪詢。
- **模擬器控制面板**：僅管理員可見，可一鍵新增 1/5 位住民或清空模擬住民，右側同步顯示連線狀態。
- **即時 KPI**：整體健康分數、已處理警報、平均回應時間會依住民狀態即時計算，「最新警報」、「照護洞察」同步更新。
- **全新視覺**：柔和漸層黃綠系搭配深色模式，住民表格依風險加上色帶，右下角浮動面板保留最新 10 筆事件紀錄。
- **程式內中文註解**：核心 JS 與 Service Worker 皆加入繁中註解，方便團隊快速理解模擬流程。

### 驗收建議
1. 以訪客登入：確認操作按鈕停用、Live Feed 仍持續更新。
2. 轉為管理員：模擬器按鈕解鎖；嘗試「隨機新增 5 位」並觀察 KPI 變化。
3. 在 DevTools 執行 `await SSEMock.checkInOne()` 或 `await SSEMock.clearGenerated()`，驗證 API 勾點。
4. Network 面板僅見一個長連線 `/events`（Chromium/Safari），Firefox 會自動切換到輪詢。
5. 比對 `localhost:5173` 與 `localhost:5500`，版面與功能需一致。

### 疑難排解
- **模擬器未啟動**：重新整理一次，或清除快取後再載入（SW 版本號：`sse-mock-v2`）。
- **HTTPS 提示**：瀏覽器規定 Service Worker 必須在 HTTPS 或 `localhost`，請確保網址為 `localhost`。
- **資料重置**：所有資料存放於 `localStorage`，可透過 DevTools Storage 清除。
