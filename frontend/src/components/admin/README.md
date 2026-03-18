# Admin Components

## 中文說明

### 目的
`src/components/admin/` 是直接對接 backend 管理端資源的前端控制台。這些元件目前採取每個資源一個面板的直接模式，而不是抽象成通用 CRUD 框架。

### English Overview
`src/components/admin/` is the frontend control surface for backend-managed resources. The current implementation keeps a direct one-panel-per-resource structure instead of a generic CRUD framework.

### 此目錄包含什麼 / What exists here
- `AdminSection.tsx`
- `UsersAdmin.tsx`
- `DevicesAdmin.tsx`
- `LocationsAdmin.tsx`
- `EventsAdmin.tsx`
- `DeviceLogsAdmin.tsx`
- `ResidentsAdmin.tsx`
- `UserStatusAdmin.tsx`
- `KpiAdmin.tsx`

### 核心檔案與責任 / Key files and responsibilities
- `AdminSection.tsx`
  - tab 容器，預設開在 `residents`
- `ResidentsAdmin.tsx`
  - resident 聚合資料檢視、搜尋、篩選
- `EventsAdmin.tsx`
  - event CRUD 與 handle
- `DeviceLogsAdmin.tsx`
  - 裝置日誌 CRUD 與 data reception status 顯示
- `UserStatusAdmin.tsx`
  - user status 維護
- `UsersAdmin.tsx` / `DevicesAdmin.tsx` / `LocationsAdmin.tsx` / `KpiAdmin.tsx`
  - 對應各自資源 CRUD

### 近期改動 / Recent changes
- `ResidentsAdmin.tsx` 已切到新的 resident 聚合 API shape。
- `AdminSection.tsx` 以翻譯 key 建立 tab 標籤。
- demo flow 測試已覆蓋 `UserStatusAdmin` 與 `KpiAdmin` 的提交。

### 工作流 / Workflow
1. `AdminSection.tsx` 根據 active tab 載入面板。
2. 每個面板 mount 時自行抓所需資源。
3. create / update / delete / handle 後，面板重新抓資料。

### 資料流或互動流 / Data flow or interaction flow
- `UsersAdmin` -> `userApi`
- `DevicesAdmin` -> `deviceApi` + `userApi`
- `LocationsAdmin` -> `locationApi`
- `EventsAdmin` -> `eventApi` + `userApi` + `deviceApi` + `locationApi`
- `DeviceLogsAdmin` -> `deviceDataLogApi` + `deviceApi` + `dataReceptionApi`
- `ResidentsAdmin` -> `residentApi`
- `UserStatusAdmin` -> `userStatusApi` + `userApi` + `deviceApi` + `locationApi`
- `KpiAdmin` -> `kpiApi`

### 與後端整合方式 / Integration with backend
- 所有 admin 元件都透過 `src/services/api.ts` 打 backend。
- 多數 list 查詢使用寬鬆 `limit=1000`，再於前端做搜尋或選單生成。

### 狀態管理方式 / State management
- 完全使用 local state。
- 每個元件都有自己的 `editing`、`form`、`error`、`loading`。

### 多語系處理 / i18n
- `ResidentsAdmin.tsx` 已較完整接入 i18n。
- 其他多個 admin 檔案仍存在硬編碼與舊編碼字串。

### 測試方式 / Testing
- `tests/ui/demo-flow.spec.ts` 會操作 `User status` 與 `KPI`。
- 其餘 admin 面板目前以手動驗證為主。

### 維護注意事項 / Maintenance notes
- backend schema 變動先檢查 `src/types/backend.ts`。
- 若要清理 admin UX，優先把硬編碼字串搬進 `locales/`。

### 目前限制 / Known limitations
- 缺少共用表單抽象。
- 字串品質不一致。
- `DeviceLogsAdmin.tsx` 保留 demo 偏向的預設值。

### 已移除或棄用項目 / Deprecated or removed items
- 舊 resident editor hook 已移除，表單狀態分散回各 admin component。
- simulator flow 已不在 admin 中存在。

### 建議閱讀順序 / Suggested reading order
1. `AdminSection.tsx`
2. `ResidentsAdmin.tsx`
3. `EventsAdmin.tsx`
4. `DeviceLogsAdmin.tsx`
5. `UserStatusAdmin.tsx`
6. `UsersAdmin.tsx` / `DevicesAdmin.tsx` / `LocationsAdmin.tsx` / `KpiAdmin.tsx`

## English Overview

### Purpose
`src/components/admin/` provides the frontend control panels for backend-managed resources. The current implementation keeps a direct one-panel-per-resource pattern instead of abstracting everything into a generic CRUD system.

### What exists here
- `AdminSection.tsx`
- `UsersAdmin.tsx`
- `DevicesAdmin.tsx`
- `LocationsAdmin.tsx`
- `EventsAdmin.tsx`
- `DeviceLogsAdmin.tsx`
- `ResidentsAdmin.tsx`
- `UserStatusAdmin.tsx`
- `KpiAdmin.tsx`

### Key files and responsibilities
- `AdminSection.tsx`
  - Owns tab switching and defaults to `residents`
- `ResidentsAdmin.tsx`
  - Resident aggregate viewer with search and filter
- `EventsAdmin.tsx`
  - Event CRUD and event handling
- `DeviceLogsAdmin.tsx`
  - Device log CRUD and data-reception status display
- `UserStatusAdmin.tsx`
  - User status maintenance
- `UsersAdmin.tsx` / `DevicesAdmin.tsx` / `LocationsAdmin.tsx` / `KpiAdmin.tsx`
  - CRUD for their respective resources

### Recent changes
- `ResidentsAdmin.tsx` now follows the newer resident aggregate API shape.
- `AdminSection.tsx` builds tab labels from translation keys.
- The demo flow now submits through `UserStatusAdmin` and `KpiAdmin`.

### Workflow
1. `AdminSection.tsx` renders the active panel based on tab state.
2. Each panel fetches the resources it needs on mount.
3. After create/update/delete/handle actions, the panel reloads its own data.

### Data flow or interaction flow
- `UsersAdmin` -> `userApi`
- `DevicesAdmin` -> `deviceApi` + `userApi`
- `LocationsAdmin` -> `locationApi`
- `EventsAdmin` -> `eventApi` + `userApi` + `deviceApi` + `locationApi`
- `DeviceLogsAdmin` -> `deviceDataLogApi` + `deviceApi` + `dataReceptionApi`
- `ResidentsAdmin` -> `residentApi`
- `UserStatusAdmin` -> `userStatusApi` + `userApi` + `deviceApi` + `locationApi`
- `KpiAdmin` -> `kpiApi`

### Integration with backend
- Every admin component talks to the backend through `src/services/api.ts`.
- Most list loaders use wide `limit=1000` queries and then filter or build selectors in the frontend.

### State management
- Entirely local component state.
- Each panel owns its own `editing`, `form`, `error`, and `loading` values.

### i18n
- `ResidentsAdmin.tsx` is the most complete i18n integration so far.
- Several other admin files still contain hard-coded and legacy-encoded text.

### Testing
- `tests/ui/demo-flow.spec.ts` interacts with the `User status` and `KPI` panels.
- The rest of the admin surface is still primarily verified manually.

### Maintenance notes
- Start every backend schema review in `src/types/backend.ts`.
- If admin UX is being cleaned up, move hard-coded labels into `locales/` first.

### Known limitations
- There is no shared form abstraction.
- String quality remains inconsistent.
- `DeviceLogsAdmin.tsx` still carries demo-oriented default values.

### Deprecated or removed items
- The older resident editor hook is gone; forms are now local to each admin component.
- Simulator-era flows no longer exist inside admin.

### Suggested reading order
1. `AdminSection.tsx`
2. `ResidentsAdmin.tsx`
3. `EventsAdmin.tsx`
4. `DeviceLogsAdmin.tsx`
5. `UserStatusAdmin.tsx`
6. `UsersAdmin.tsx` / `DevicesAdmin.tsx` / `LocationsAdmin.tsx` / `KpiAdmin.tsx`
