# Future PWA Frontend

## English Version
This directory will host the React + Vite + TypeScript Progressive Web App that replaces the legacy static dashboard. Tooling is prewired (package.json, vite.config.ts, tsconfig.json, ESLint with React/TS plugins) so we can migrate modules incrementally while sharing config with the monorepo.

### Current State
- Toolchain: Vite 5, React 18, TypeScript 5 with ESLint/Prettier ready to run.
- UI shell: responsive navigation header, bilingual copy, KPI cards, and the new resident directory (filters + admin actions) that mirrors the production UX hierarchy.
- Data access: live residents come from the SSE simulator via `src/shared/resident-live-store.tsx`; hooks will swap to real APIs once contracts stabilise.
- Simulator: service worker streams (`/sim/sse`) and snapshots (`/sim/snapshot`) now cover spawn/burst/mutate/clear/clearAll/addCustom paths so tests and demos stay backend-free.
- Styling: custom CSS tokens tuned for readability (18 px base font, high contrast). Extractable into a design system when we port more widgets.
- i18n: powered by `i18next`, `react-i18next`, and `i18next-browser-languagedetector`. JSON resources live under `src/locales/<locale>/translation.json`.

### Development Workflow
1. `npm install` inside `frontend/`.
2. `npm run dev -- --host` (port 5173) so backend CORS sees the dev server.
3. Organise code under `src/features/<area>` (components/hooks/tests colocated).
4. Shared utilities (i18n, future DataGateway hooks) should be exported from `src/shared/`. Prefer `useTranslation()` from `react-i18next` and extend the locale JSON files.

### Resident SSE Simulator & Snapshot Helpers
- Service worker endpoint `/sim/sse` emits Server-Sent Events; `src/sse/client.ts` manages subscription, reconnection, and listeners.
- `/sim/snapshot` returns the full roster (seeded, dynamic, manual). It powers manual refresh, auto-polling, and upcoming Playwright fixtures.
- Connect flow: an immediate replay of the roster plus keep-alive pings every 15 s keeps the table hydrated without reloads.
- Base seeds stay intact, but admins/tests can spawn, mutate, or clear residents; manual entries are tagged with `origin: 'manual'`.
- The Residents badge mirrors connection state (Streaming / Paused / Manual refresh) and mm:ss since the last event, matching the caregiver handover narrative.

#### Admin Simulator Controls
The `SimulatorControls` block now sits directly above the resident table (no floating toggle). Every action hits the service worker via `postMessage`:

```ts
// src/services/simulator-controls.ts
type CustomResidentPayload = {
  id: string;
  name: string;
  room: string;
  status: ResidentStatus;
  lastSeenAt?: string;
  lastSeenLocation?: string;
};

type SimulatorCommand =
  | { action: 'spawn' | 'burst' | 'mutate' | 'clear' | 'clearAll' }
  | { action: 'delete'; id: string }
  | { action: 'addCustom'; resident: CustomResidentPayload };
```

- **Data actions**: single update, burst ×10, spawn new, clear dynamic, clear entire roster, delete selected row.
- **Custom resident form**: admins enter name/room/status/time/location to insert curated residents; entries sync immediately to the state store and worker.
- **Helper API**: `src/services/simulator-controls.ts` exposes `simulatorActions` and `fetchResidentSnapshot()` so other hooks/tests reuse the same contract.

Service worker (`public/sse-sw.js`) contracts:
- `spawn`: add a dynamic resident (`origin: 'dynamic'`).
- `burst`: emit 10 update events quickly.
- `mutate`: one update event against a random active resident.
- `clear`: checkout + remove all dynamic residents.
- `clearAll`: checkout + remove every resident and temporarily suppress seed repopulation until new data arrives.
- `delete`: checkout + remove a single resident by `id`.
- `addCustom`: inject a manual resident, echoing back as `resident.new`.

![SSE simulator demo](../docs/sse-demo.gif)

#### Streaming & Refresh Controls
- Start/Stop buttons control the SSE connection through `resident-live-store` (`startStream` / `stopStream`).
- “Refresh now” calls `/sim/snapshot`; the results hydrate the store and recompute KPI/alert/insight derivations.
- Auto-refresh accepts a configurable interval (default 10 s, min 2 s). Polling only runs when streaming is paused.
- Status text clearly labels Streaming, Reconnecting, Manual refresh, or Paused so demo scripts remain predictable.

### Admin Editing & Deleting
- Admins can open the edit modal (name/room/status/last-seen) or use the row-level Delete shortcut, both wired to `useResidentEditor`.
- Every resident (seeded, dynamic, manual) can be deleted; the SW translates deletions into checkout events so history stays coherent.
- KPI cards, Recent Alerts, and Care Insights recompute instantly from the shared resident store after any edit, deletion, or custom addition.
- The custom-resident form in `SimulatorControls` uses the same schema as the editor, making it easy to seed demo personas.

### Legacy Dashboard Reference
- The static HTML dashboard under `web-dashboard/` now mirrors the same SSE mock and yellow–green design language.
- Default credentials (guest/caregiver/admin) and detailed run steps live in `web-dashboard/README.md`. Check it when coordinating demos that rely on the non-React build.

### Testing & Preview
- `npm run build` outputs to `dist/`; Vite preview serves the service worker automatically.
- Quick smoke check:
  1. `npm install && npm run dev`
  2. Resize the window — SmartCare branding + nav stay aligned while the roster fills within 3 s.
  3. As admin, exercise the simulator block: start/stop streaming, spawn/burst, clear dynamic/all, add a custom resident, then delete it.
  4. Switch to manual refresh, set auto-refresh to 5 s, and confirm `/sim/snapshot` keeps the table healthy while streaming is paused.
  5. Stop/restart the dev server; the client reconnects in ≈3 s and surfaces the latest statuses.

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
- UI 外殼：提供響應式導覽列、雙語文案、KPI 卡與新版住民名冊（含篩選與管理員操作），協助對照正式介面。
- 資料存取：`src/shared/resident-live-store.tsx` 連接 SSE 模擬器；未來會以 Hook 封裝實際 API。
- 模擬器：Service Worker 既推送 `/sim/sse`，亦提供 `/sim/snapshot` 供手動刷新／測試使用，並支援 spawn/burst/mutate/clear/clearAll/addCustom。
- 樣式：自訂 CSS Token，以 18 px 字級與高對比增進可讀性；後續可抽成設計系統。
- i18n：透過 `i18next`、`react-i18next`、`i18next-browser-languagedetector`。翻譯檔案位於 `src/locales/<locale>/translation.json`。

### 開發流程
1. 在 `frontend/` 目錄執行 `npm install`。
2. 使用 `npm run dev -- --host`（預設 5173 埠），確保與後端 CORS 相容。
3. 採用 `src/features/<領域>` 架構，元件 / Hook / 測試共置。
4. 共享工具（如 i18n、DataGateway Hook）統一由 `src/shared/` 匯出。建議使用 `react-i18next` 的 `useTranslation()`，再把字串寫進對應的 JSON 翻譯檔。

### 住民 SSE 模擬器與 Snapshot
- Service Worker (`/sim/sse`) 以 SSE 推送資料；`src/sse/client.ts` 負責連線與重試。
- `/sim/snapshot` 回傳完整名冊（預設、動態、自訂）；提供手動刷新、自動輪詢與未來測試使用。
- 首次連線會重播名冊並每 15 秒送 keep-alive，讓表格即刻填滿且維持連線。
- Seeds 仍穩定存在，但管理員與測試可透過按鈕新增/清空；自訂資料以 `origin: 'manual'` 標示。
- LIVE 徽章會顯示 Streaming / Paused / Manual refresh 狀態與距離上一筆事件的 mm:ss。

#### 模擬器控制（管理員專用）
`SimulatorControls` 置於住民表格上方（不再浮動）。所有操作透過 `postMessage` 送往 Service Worker：

```ts
type CustomResidentPayload = {
  id: string;
  name: string;
  room: string;
  status: ResidentStatus;
  lastSeenAt?: string;
  lastSeenLocation?: string;
};

type SimulatorCommand =
  | { action: 'spawn' | 'burst' | 'mutate' | 'clear' | 'clearAll' }
  | { action: 'delete'; id: string }
  | { action: 'addCustom'; resident: CustomResidentPayload };
```

- **資料操作**：單筆更新、連發 ×10、新增住民、清除動態、清除全部、刪除選中住民。
- **自訂表單**：輸入姓名／房號／狀態／時間／地點即可插入 Demo 角色，並同步到狀態儲存。
- **共用 Helper**：`src/services/simulator-controls.ts` 提供 `simulatorActions` 與 `fetchResidentSnapshot()`，測試與其他 Hook 共用同一契約。

Service Worker (`public/sse-sw.js`) 指令摘要：
- `spawn`：新增動態住民。
- `burst`：快速送出 10 筆更新。
- `mutate`：針對隨機住民送出 1 筆更新。
- `clear`：清除所有動態住民。
- `clearAll`：清除全體住民並暫停重建 seed，直到有新資料。
- `delete`：依 `id` 刪除任一住民。
- `addCustom`：注入自訂住民並以 `resident.new` 回傳。

![SSE 模擬器示意](../docs/sse-demo.gif)

#### 串流與刷新控制
- 「開始/停止即時更新」直接控制 SSE 連線。
- 「立即刷新」呼叫 `/sim/snapshot`，結果會重灌名冊並重新計算 KPI/警報/洞察。
- 自動刷新可設定間隔（預設 10 秒，最小 2 秒）；僅在停止串流時啟用輪詢。
- LIVE 標籤會顯示 Streaming、Reconnecting、Manual refresh 或 Paused，方便 Demo 腳本說明。

### 管理員編輯與刪除
- 透過列內 Edit 按鈕開啟 Modal，調整姓名／房號／狀態／最後巡房資訊。
- 列內 Delete 可刪除任何住民（種子、動態、自訂皆可），刪除前會跳出確認訊息並由 SW 轉換為 checkout 事件。
- KPI、最新警報與照護洞察會在每次編輯／刪除／自訂新增後即時重新推導。

### 傳統儀表板參考
- `web-dashboard/` 下的靜態儀表板已同步更新為淺黃綠設計並使用相同 SSE 模擬器。
- 預設登入帳密（guest / caregiver / admin）與執行步驟請見 `web-dashboard/README.md`，便於在無 React 依賴的示範環境使用。

### 測試與預覽
- `npm run build` 會輸出到 `dist/`；部署靜態檔案時記得把 `public/sse-sw.js` 一併放到網站根目錄（Vite preview 會自動處理）。
- `npm run preview` 能重現同一套模擬器，部署前即可確認 LIVE 觀測是否正常。
- 快速驗證流程：
  1. `npm install && npm run dev`
  2. 縮放視窗，確認品牌／導覽保持整齊，列表在 3 秒內出現且生命徵象自動更新。
  3. 以管理員操作模擬器：啟停串流、連發、清除動態或全部、輸入自訂住民並刪除。
  4. 切換到手動刷新，設定自動刷新為 5 秒，並在暫停串流時確認 `/sim/snapshot` 能維持最新資料。
  5. 停止 dev server 再重新啟動，確認前端能在約 3 秒內自動重連並顯示正確狀態。

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
