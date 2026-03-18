# Runtime Source

## 中文說明

### 目的
`src/` 是前端實際執行時程式碼的根目錄，包含 React 啟動點、頁面殼層、共享狀態、資料型別、API 邊界、地圖工具、圖表元件與翻譯資源。

### English Overview
`src/` is the root of the runtime application code. It contains the React bootstrap, app shell, shared state, data contracts, API boundary, map tooling, charts, and translation resources.

### 此目錄包含什麼 / What exists here
- `main.tsx`
- `App.tsx`
- `i18n.ts`
- `adapters/`
- `components/`
- `constants/`
- `hooks/`
- `locales/`
- `services/`
- `shared/`
- `sse/`
- `styles/`
- `types/`
- `utils/`

### 核心檔案與責任 / Key files and responsibilities
- `main.tsx`
  - 初始化 i18n、Leaflet CSS、Suspense fallback 與 `ResidentLiveProvider`。
- `App.tsx`
  - 組合整個單頁 dashboard，並推導 KPI、圖表、insights 與 theme 狀態。
- `i18n.ts`
  - 靜態匯入三份 translation JSON，配置 browser language detection。

### 近期改動 / Recent changes
- 移除了舊 `src/sse/client.ts`。
- 移除了 `useBackendResidentSnapshot.ts` 與 `useResidentEditor.ts`。
- 新增事件警報、緊急彈窗、推播與 IMU 圖表相關元件。

### 工作流 / Workflow
1. `main.tsx` 啟動 React。
2. `ResidentLiveProvider` 載入住戶資料。
3. `App.tsx` 讀取共享資料並組裝畫面。
4. 各 feature 再透過 `services/api.ts` 取額外資料。

### 資料流或互動流 / Data flow or interaction flow
- resident snapshot 是主要共享資料流。
- 事件、位置、推播、IMU 日誌採 feature-local fetch。

### 與後端整合方式 / Integration with backend
- `constants/backend.ts` 決定 API base URL。
- `services/api.ts` 是唯一允許建立 backend request 的地方。

### 狀態管理方式 / State management
- 全域共享：`ResidentLiveProvider` context。
- 共用輪詢：`useBackendEvents`。
- 其餘功能採 local state。

### 多語系處理 / i18n
- `i18n.ts` 與 `locales/` 是唯一翻譯來源。
- 不是所有 admin 字串都已翻譯完成。

### 測試方式 / Testing
- `tests/ui/` 的 Playwright 覆蓋主要互動流程。
- `vite.config.ts` 已把 `tests/ui` 排除在 Vitest 之外。

### 維護注意事項 / Maintenance notes
- backend 欄位變更優先檢查 `types/` -> `adapters/` -> `shared/` -> `components/`。
- 若新狀態不需要跨畫面共享，避免過早放進 context。

### 目前限制 / Known limitations
- `App.tsx` 仍是大型組裝檔案。
- 少量 mixed-language 與 legacy-encoding 字串仍存在。

### 已移除或棄用項目 / Deprecated or removed items
- `src/sse/client.ts`
- `src/hooks/useBackendResidentSnapshot.ts`
- `src/hooks/useResidentEditor.ts`

### 建議閱讀順序 / Suggested reading order
1. `main.tsx`
2. `App.tsx`
3. `shared/resident-live-store.tsx`
4. `services/api.ts`
5. `types/`
6. `components/`

## English Overview

### Purpose
`src/` contains the runtime application code for the frontend. It includes the React bootstrap, page shell, shared state, data contracts, API layer, map tooling, charts, and translation resources.

### What exists here
- `main.tsx`
- `App.tsx`
- `i18n.ts`
- `adapters/`
- `components/`
- `constants/`
- `hooks/`
- `locales/`
- `services/`
- `shared/`
- `sse/`
- `styles/`
- `types/`
- `utils/`

### Key files and responsibilities
- `main.tsx`
  - Initializes i18n, Leaflet CSS, the Suspense fallback, and `ResidentLiveProvider`.
- `App.tsx`
  - Composes the full dashboard and derives KPI, chart, insight, and theme state.
- `i18n.ts`
  - Loads the translation JSON files and configures browser language detection.

### Recent changes
- Removed the old `src/sse/client.ts`.
- Removed `useBackendResidentSnapshot.ts` and `useResidentEditor.ts`.
- Added alert, emergency modal, push notification, and IMU chart features.

### Workflow
1. `main.tsx` starts React.
2. `ResidentLiveProvider` loads resident data.
3. `App.tsx` consumes shared data and assembles the UI.
4. Each feature fetches extra backend data through `services/api.ts` as needed.

### Data flow or interaction flow
- The resident snapshot is the main shared data flow.
- Events, locations, push notifications, and IMU logs use feature-local fetching.

### Integration with backend
- `constants/backend.ts` determines the API base URL.
- `services/api.ts` is the only intended place to build backend requests.

### State management
- Global shared state: `ResidentLiveProvider` context.
- Reusable polling: `useBackendEvents`.
- Everything else: local component state.

### i18n
- `i18n.ts` and `locales/` are the only translation sources.
- Not every admin-facing string has been translated yet.

### Testing
- `tests/ui/` contains the Playwright coverage for key flows.
- `vite.config.ts` excludes `tests/ui` from Vitest.

### Maintenance notes
- Backend field changes should be reviewed in `types/` -> `adapters/` -> `shared/` -> `components/`.
- Avoid moving state into context unless it truly needs to be shared across screens.

### Known limitations
- `App.tsx` is still a large orchestration file.
- A small number of mixed-language and legacy-encoded strings remain.

### Deprecated or removed items
- `src/sse/client.ts`
- `src/hooks/useBackendResidentSnapshot.ts`
- `src/hooks/useResidentEditor.ts`

### Suggested reading order
1. `main.tsx`
2. `App.tsx`
3. `shared/resident-live-store.tsx`
4. `services/api.ts`
5. `types/`
6. `components/`
