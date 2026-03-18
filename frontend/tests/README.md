# Frontend Tests

## 中文說明

### 目的
`frontend/tests/` 目前主要承載 Playwright 的 UI / integration 測試，而不是 isolated unit test。這些測試直接對 backend 做 request，並驅動畫面驗證主要互動流程。

### English Overview
`frontend/tests/` currently exists mainly for Playwright UI / integration tests rather than isolated unit tests. These tests talk to the backend directly and then drive the browser to validate major interaction flows.

### 此目錄包含什麼 / What exists here
- `ui/demo-flow.spec.ts`
- `ui/frontend-interaction.spec.ts`
- `ui/helpers.ts`

### 核心檔案與責任 / Key files and responsibilities
- `ui/frontend-interaction.spec.ts`
  - 驗證 alert modal 顯示、事件狀態更新、dashboard 多節點同步更新
- `ui/demo-flow.spec.ts`
  - 驗證 outdoor geofence、緊急彈窗、admin tab 與表單提交
- `ui/helpers.ts`
  - 透過 Playwright request context 呼叫 backend API，建立資料與清理 active events

### 近期改動 / Recent changes
- 新增 `frontend/playwright.config.ts`
- 新增 demo flow 與 frontend interaction 兩支 E2E 測試
- artefact 輸出指向 `docs/demo records/...`

### 工作流 / Workflow
1. Playwright 以 `baseURL` 開啟頁面
2. `helpers.ts` 先透過 backend API 建立或清理資料
3. 測試驅動 UI 操作並做 assertion

### 資料流或互動流 / Data flow or interaction flow
- test -> Playwright request -> backend mutation -> browser UI update -> assertion

### 與後端整合方式 / Integration with backend
- 這些測試不是 mock backend
- 它們會直接呼叫 `/api/v1/devices/`、`/api/v1/locations/`、`/api/v1/data-reception/receive`、`/api/v1/events/`

### 狀態管理方式 / State management
- 測試不直接維護前端狀態
- 狀態由 backend 與實際 UI runtime 決定

### 多語系處理 / i18n
- `beforeEach` 會把 `i18nextLng` 設成 `en`

### 測試方式 / Testing

```bash
cd frontend
npm run test:e2e
```

- `npm run test` 不會跑這裡的檔案，因為 `vite.config.ts` 已排除 `tests/ui/**`

### 維護注意事項 / Maintenance notes
- 這些測試會修改 backend 狀態，必須在可重置環境執行
- 調整 alert 按鈕文字、admin tab 標籤或 modal 結構時，可能要同步改 selector

### 目前限制 / Known limitations
- 依賴真實 backend，可重現性取決於資料庫狀態
- 目前沒有 unit test 覆蓋 `src/` 的純函式與 adapter

### 已移除或棄用項目 / Deprecated or removed items
- 沒有保留的舊前端測試框架，但也沒有正式維護中的 component/unit test 套件

### 建議閱讀順序 / Suggested reading order
1. `ui/helpers.ts`
2. `ui/frontend-interaction.spec.ts`
3. `ui/demo-flow.spec.ts`
4. `../playwright.config.ts`

## English Overview

### Purpose
`frontend/tests/` is mainly used for Playwright UI / integration tests, not isolated unit tests. These tests call the backend directly and then drive the browser to verify major user flows.

### What exists here
- `ui/demo-flow.spec.ts`
- `ui/frontend-interaction.spec.ts`
- `ui/helpers.ts`

### Key files and responsibilities
- `ui/frontend-interaction.spec.ts`
  - Verifies alert modal visibility, event status updates, and synchronized dashboard updates
- `ui/demo-flow.spec.ts`
  - Verifies outdoor geofence flow, the emergency modal, admin tabs, and form submissions
- `ui/helpers.ts`
  - Calls backend APIs through Playwright request context to seed and clean up data

### Recent changes
- Added `frontend/playwright.config.ts`
- Added the demo flow and frontend interaction E2E suites
- Artifacts now land under `docs/demo records/...`

### Workflow
1. Playwright opens the page through the configured `baseURL`
2. `helpers.ts` prepares or clears backend data
3. The test drives the UI and asserts behavior

### Data flow or interaction flow
- test -> Playwright request -> backend mutation -> browser UI update -> assertion

### Integration with backend
- These tests do not mock the backend
- They call `/api/v1/devices/`, `/api/v1/locations/`, `/api/v1/data-reception/receive`, and `/api/v1/events/`

### State management
- The tests do not own frontend state directly
- Runtime state is determined by the backend and the real UI

### i18n
- `beforeEach` sets `i18nextLng` to `en`

### Testing

```bash
cd frontend
npm run test:e2e
```

- `npm run test` does not run these files because `vite.config.ts` excludes `tests/ui/**`

### Maintenance notes
- These tests mutate backend state and must run against a resettable environment
- Changing alert labels, admin tab labels, or modal structure may require selector updates

### Known limitations
- The suite depends on a real backend, so repeatability depends on database state
- There is currently no unit-test coverage for the pure helpers and adapters in `src/`

### Deprecated or removed items
- No legacy frontend test framework remains, but there is also no maintained component/unit-test suite today

### Suggested reading order
1. `ui/helpers.ts`
2. `ui/frontend-interaction.spec.ts`
3. `ui/demo-flow.spec.ts`
4. `../playwright.config.ts`
