# Future PWA Frontend

## English Version
This directory will host the React + Vite + TypeScript Progressive Web App that replaces the legacy static dashboard. Tooling is prewired (package.json, vite.config.ts, tsconfig.json, ESLint with React/TS plugins) so we can migrate modules incrementally while sharing config with the monorepo.

### Current State
- Toolchain: Vite 5, React 18, TypeScript 5.
- Data access: reuse the legacy dashboard’s DataGateway until dedicated React hooks are created.
- Styling: no UI library yet; plan to extract tokens from the static dashboard and expose via CSS variables or Tailwind config.

### Development Workflow
1. `npm install` inside `frontend/`.
2. `npm run dev -- --host` (port 5173) to align with backend CORS.
3. Organize code under `src/features/<area>` (components/hooks/tests colocated).
4. Export shared utilities (i18n, DataGateway hooks) from `src/shared/` as they solidify.

### Migration Plan
1. Extract reusable atoms (buttons, cards, tables) from `frontend/web-dashboard` into React components.
2. Wrap DataGateway with hooks (`useResidents`, `useMessages`, etc.) to keep local/api/hybrid transparent.
3. Implement authentication context reusing `APP_CONFIG` (token, feature flags), then connect to backend JWT once ready.
4. Add service worker + Web Push via `@vite-pwa/vite-plugin` when backend push endpoints exist.

## 繁體中文（香港）版本
此目錄將承載未來的 React + Vite + TypeScript PWA，以取代舊版靜態儀表板。`package.json`、`vite.config.ts`、`tsconfig.json` 及 ESLint（React/TS 插件）已就緒，可逐步遷移模組並與 Monorepo 共用設定。

### 目前狀態
- 工具鏈：Vite 5、React 18、TypeScript 5。
- 資料存取：在建立 React Hook 前，沿用舊儀表板的 DataGateway。
- 樣式：尚未導入 UI Library，後續將從靜態儀表板抽出設計 Token，透過 CSS 變數或 Tailwind 配置。

### 開發流程
1. 在 `frontend/` 執行 `npm install`。
2. `npm run dev -- --host`（5173 埠）以利後端設定 CORS。
3. 採用 `src/features/<領域>` 架構，元件、Hook、測試共置。
4. 隨共享工具穩定後，從 `src/shared/` 匯出 i18n 與 DataGateway Hook。

### 遷移計畫
1. 從 `frontend/web-dashboard` 抽出可重複使用的元件（按鈕、卡片、表格），轉為 React 元件。
2. 以 Hook 包裝 DataGateway（`useResidents`、`useMessages` 等），確保 local/api/hybrid 轉換無感。
3. 建立重用 `APP_CONFIG` 的認證 Context，待後端 JWT 完成後串接。
4. 後端 `/push` 完成後，透過 `@vite-pwa/vite-plugin` 加入 Service Worker 與 Web Push。
