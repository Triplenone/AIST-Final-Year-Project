# Future PWA Frontend

## English Version
This directory will host the React + Vite + TypeScript Progressive Web App that replaces the legacy static dashboard. Tooling is prewired (package.json, vite.config.ts, tsconfig.json, ESLint with React/TS plugins) so we can migrate modules incrementally while sharing config with the monorepo.

### Current State
- Toolchain: Vite 5, React 18, TypeScript 5 with ESLint/Prettier ready to run.
- UI shell: accessible dashboard stub with simulated metrics, resident filters, and bilingual navigation to guide the migration.
- Data access: legacy DataGateway remains the source of truth; hooks will replace it once the API contracts stabilise.
- Styling: custom CSS tokens tuned for readability (18 px base font, high contrast). Extractable into a design system when we port more widgets.
- i18n: powered by `i18next`, `react-i18next`, and `i18next-browser-languagedetector`. JSON resources live under `src/locales/<locale>/translation.json`.

### Development Workflow
1. `npm install` inside `frontend/`.
2. `npm run dev -- --host` (port 5173) so backend CORS sees the dev server.
3. Organise code under `src/features/<area>` (components/hooks/tests colocated).
4. Shared utilities (i18n, future DataGateway hooks) should be exported from `src/shared/`. Prefer `useTranslation()` from `react-i18next` and extend the locale JSON files.

### Resident SSE Simulator (No Backend Required)
- Endpoint: a service worker at `/sim/sse` emits Server‑Sent Events; the client connects via `src/sse/client.ts`.
- Stream cadence: one event every 1–3 seconds; keep‑alive pings every 15 seconds.
- Initial snapshot: on connect, the current roster is replayed as `resident.new` events so the table fills instantly.
- Seed vs dynamic: a stable base roster is always present; admins may add and remove dynamic entries.
- Live status: the Residents header shows connection state and mm:ss since the last event.

#### Admin Simulator Controls
Visible only for the admin role (toggle button in the header). Actions are sent to the SW via `postMessage`:

```ts
// src/services/simulator-controls.ts
type SimulatorCommand =
  | { action: 'spawn' | 'burst' | 'mutate' | 'clear' }
  | { action: 'delete'; id: string };

// Usage (examples)
await sendSimulatorMessage({ action: 'mutate' });
await sendSimulatorMessage({ action: 'spawn' });
await sendSimulatorMessage({ action: 'delete', id: 'res-abc123' });
```

Service worker (`public/sse-sw.js`) contracts:
- `spawn`: add a dynamic resident; `origin: 'dynamic'`.
- `burst`: emit 10 update events quickly.
- `mutate`: one update event.
- `clear`: checkout + remove all dynamic residents.
- `delete`: checkout + remove a single dynamic resident by `id` (seeded residents cannot be deleted).

![SSE simulator demo](../docs/sse-demo.gif)

### Admin Editing & Deleting
- Open the Residents table and click Edit (admin only) to modify name, room, status, last‑seen time/location.
- Deletion is available for dynamically added residents; seeded residents are protected.
- All KPI cards, Recent Alerts, and Care Insights recompute from the updated directory in real time.

### Legacy Dashboard Reference
- The static HTML dashboard under `web-dashboard/` now mirrors the same SSE mock and yellow–green design language.
- Default credentials (guest/caregiver/admin) and detailed run steps live in `web-dashboard/README.md`. Check it when coordinating demos that rely on the non-React build.

### Testing & Preview
- `npm run build` outputs to `dist/`; Vite preview serves the service worker automatically.
- Quick smoke check:
  1. `npm install && npm run dev`
  2. Confirm the roster appears within 3 s and vitals mutate without reloads.
  3. As admin, open Simulator controls; try spawn → edit → delete; verify KPIs/alerts/insights update.
  4. Stop/restart the dev server; the client reconnects in ≈3 s.

### Hardware Prototyping
1. **Arduino sensor rig**: connect a simple heart-rate / temperature board (e.g., MAX30102 + DHT11) to an Arduino Nano/ESP32. Stream JSON payloads via serial every few seconds (`{"room":"204","hr":78,"bp":"118/76"}`).
2. **Bridge script**: create a Node.js worker (or simple Python script) that reads the serial feed and publishes REST calls to the existing FastAPI endpoints (or writes to a lightweight MQTT topic that DataGateway can subscribe to).
3. **Integration toggle**: expose a `dataMode: 'arduino'` branch in `APP_CONFIG`. When active, the dashboard polls the bridge endpoint instead of the local fixtures, so the simulated vitals flow straight into the React shell and the legacy dashboard simultaneously.
4. **Safety**: throttle updates (e.g., 2 Hz) and clamp impossible readings before they reach the UI to avoid distracting spikes for operators.

### Architecture & Conventions
- State: per‑feature React state; live residents provided by `src/shared/resident-live-store.tsx`.
- Derivations: `src/utils/resident-derived.ts` computes KPIs, alerts, insights; keep presentational components dumb.
- Editor: `src/hooks/useResidentEditor.ts` isolates edit/delete logic from the table UI.
- i18n: extend `src/locales/<locale>/translation.json`; prefer nouns/verbs in English keys, render with `useTranslation()`.
- Styling: `src/styles/global.css` hosts tokens/layouts; keep component CSS minimal.

### Migration Plan
1. Extract reusable atoms (buttons, cards, tables) from `web-dashboard` into React components.
2. Wrap DataGateway with hooks (`useResidents`, `useMessages`, …) to keep local/api/hybrid transparent.
3. Implement auth context, then connect to backend JWT when endpoints are ready.
4. Add Web Push via `@vite-pwa/vite-plugin` once `/push` exists.

## 繁體中文（香港）版本
此目錄將承載未來的 React + Vite + TypeScript PWA，以取代舊版靜態儀表板。`package.json`、`vite.config.ts`、`tsconfig.json` 及 ESLint（React/TS 插件）已就緒，可逐步遷移模組並與 Monorepo 共用設定。

### 目前狀態
- 工具鏈：Vite 5、React 18、TypeScript 5，搭配 ESLint/Prettier。
- UI 外殼：提供可及性強的儀表板樣板，內建模擬數據、住民篩選，以及雙語導覽協助遷移。
- 資料存取：在自訂 Hook 成形前，仍沿用舊儀表板的 DataGateway。
- 樣式：自訂 CSS Token，以 18 px 字級與高對比增進可讀性；後續可抽成設計系統。
- i18n：透過 `i18next`、`react-i18next`、`i18next-browser-languagedetector`。翻譯檔案位於 `src/locales/<locale>/translation.json`。

### 開發流程
1. 在 `frontend/` 目錄執行 `npm install`。
2. 使用 `npm run dev -- --host`（預設 5173 埠），確保與後端 CORS 相容。
3. 採用 `src/features/<領域>` 架構，元件 / Hook / 測試共置。
4. 共享工具（如 i18n、DataGateway Hook）統一由 `src/shared/` 匯出。建議使用 `react-i18next` 的 `useTranslation()`，再把字串寫進對應的 JSON 翻譯檔。

### 住民 SSE 模擬器
- `public/sse-sw.js` 會註冊 Service Worker，在 `/sim/sse` 提供串流端點，React 殼層由 `src/sse/client.ts` 自動連線。
- 住民列表每 1–3 秒推送生命徵象、房間與退房事件，無需手動重整即可持續更新。
- Residents 區塊的 **LIVE** 徽章會顯示連線狀態與距離上一筆事件的 mm:ss。
- 開發模式（`npm run dev`）右上角提供「模擬器控制」面板，可透過 postMessage 觸發 **連發 10 筆** 或 **產生新住民**。
- 首頁的「模擬更新資料」按鈕仍用於快速示範 KPI 卡片；住民資料則完全來自 SSE。

![SSE 模擬器示意](../docs/sse-demo.gif)

### 傳統儀表板參考
- `web-dashboard/` 下的靜態儀表板已同步更新為淺黃綠設計並使用相同 SSE 模擬器。
- 預設登入帳密（guest / caregiver / admin）與執行步驟請見 `web-dashboard/README.md`，便於在無 React 依賴的示範環境使用。

### 測試與預覽
- `npm run build` 會輸出到 `dist/`；部署靜態檔案時記得把 `public/sse-sw.js` 一併放到網站根目錄（Vite preview 會自動處理）。
- `npm run preview` 能重現同一套模擬器，部署前即可確認 LIVE 觀測是否正常。
- 快速驗證流程：
  1. `npm install && npm run dev`
  2. 等候住民列表在 3 秒內出現，確認不需重新整理即可更新。
  3. 透過模擬器控制面板測試連發／新增住民，LIVE 徽章應立即刷新時間。
  4. 停止 dev server 再重新啟動，確認前端能在約 3 秒內自動重連。

### 硬體雛形
1. **Arduino 感測器**：可用 Arduino Nano/ESP32 搭配心率或溫度模組（MAX30102、DHT11），每隔幾秒以序列埠輸出 JSON（如 `{\"room\":\"204\",\"hr\":78}`）。
2. **橋接程式**：撰寫 Node.js（或 Python）腳本讀取序列資料，並呼叫 FastAPI 端點／或發佈至輕量 MQTT Topic，讓 DataGateway 取得最新讀值。
3. **模式切換**：在 `APP_CONFIG` 增加 `dataMode: 'arduino'`，啟用時儀表板改向橋接端點取數據，如此 React 與舊儀表板都能顯示裝置數據。
4. **安全性**：限制更新頻率（例如 2 Hz），同時在進入 UI 前卡控不可能的讀值，避免對值班人員造成干擾。

### 遷移計畫
1. 從 `frontend/web-dashboard` 抽出可重複使用的元件（按鈕、卡片、表格），轉為 React 元件。
2. 以 Hook 包裝 DataGateway（`useResidents`、`useMessages` 等），確保 local/api/hybrid 轉換無感。
3. 建立重用 `APP_CONFIG` 的認證 Context，待後端 JWT 完成後串接。
4. 後端 `/push` 完成後，透過 `@vite-pwa/vite-plugin` 加入 Service Worker 與 Web Push。
