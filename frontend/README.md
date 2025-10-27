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

### Simulating Data
- The home screen randomises wellbeing, alert load, and resident vitals when you press **Simulate new data**.
- Filters (All / High / Needs follow-up / Stable) update instantly without a page reload.
- Use the language switcher in the header for EN / 繁 / 简; the browser will remember your preference through `i18next-browser-languagedetector`.

### Hardware Prototyping (mentor request)
1. **Arduino sensor rig**: connect a simple heart-rate / temperature board (e.g., MAX30102 + DHT11) to an Arduino Nano/ESP32. Stream JSON payloads via serial every few seconds (`{"room":"204","hr":78,"bp":"118/76"}`).
2. **Bridge script**: create a Node.js worker (or simple Python script) that reads the serial feed and publishes REST calls to the existing FastAPI endpoints (or writes to a lightweight MQTT topic that DataGateway can subscribe to).
3. **Integration toggle**: expose a `dataMode: 'arduino'` branch in `APP_CONFIG`. When active, the dashboard polls the bridge endpoint instead of the local fixtures, so the simulated vitals flow straight into the React shell and the legacy dashboard simultaneously.
4. **Safety**: throttle updates (e.g., 2 Hz) and clamp impossible readings before they reach the UI to avoid distracting spikes for operators.

### Migration Plan
1. Extract reusable atoms (buttons, cards, tables) from `frontend/web-dashboard` into React components.
2. Wrap DataGateway with hooks (`useResidents`, `useMessages`, etc.) to keep local/api/hybrid transparent.
3. Implement authentication context reusing `APP_CONFIG` (token, feature flags), then connect to backend JWT once ready.
4. Add service worker + Web Push via `@vite-pwa/vite-plugin` when backend push endpoints exist.

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

### 模擬資料
- 首頁的 **模擬更新資料** 按鈕會隨機刷新健康指標、警報負載與住民生命徵象。
- 篩選器（全部／高優先／需跟進／穩定）可即時切換，無需重新整理。
- 頂部語言切換支援英／繁／简，`i18next-browser-languagedetector` 會記住偏好。

### 硬體雛形（導師需求）
1. **Arduino 感測器**：可用 Arduino Nano/ESP32 搭配心率或溫度模組（MAX30102、DHT11），每隔幾秒以序列埠輸出 JSON（如 `{\"room\":\"204\",\"hr\":78}`）。
2. **橋接程式**：撰寫 Node.js（或 Python）腳本讀取序列資料，並呼叫 FastAPI 端點／或發佈至輕量 MQTT Topic，讓 DataGateway 取得最新讀值。
3. **模式切換**：在 `APP_CONFIG` 增加 `dataMode: 'arduino'`，啟用時儀表板改向橋接端點取數據，如此 React 與舊儀表板都能顯示裝置數據。
4. **安全性**：限制更新頻率（例如 2 Hz），同時在進入 UI 前卡控不可能的讀值，避免對值班人員造成干擾。

### 遷移計畫
1. 從 `frontend/web-dashboard` 抽出可重複使用的元件（按鈕、卡片、表格），轉為 React 元件。
2. 以 Hook 包裝 DataGateway（`useResidents`、`useMessages` 等），確保 local/api/hybrid 轉換無感。
3. 建立重用 `APP_CONFIG` 的認證 Context，待後端 JWT 完成後串接。
4. 後端 `/push` 完成後，透過 `@vite-pwa/vite-plugin` 加入 Service Worker 與 Web Push。
