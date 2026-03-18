# Hooks

## 中文說明

### 目的
`src/hooks/` 現在只保留真正仍在使用、且有跨元件重用價值的 hook。這次重構後，hooks 數量大幅縮減。

### English Overview
`src/hooks/` now keeps only hooks that are still active and reused by multiple components. The folder was significantly reduced during the recent cleanup.

### 此目錄包含什麼 / What exists here
- `useBackendEvents.ts`

### 核心檔案與責任 / Key files and responsibilities
- 輪詢 `/api/v1/events`
- 提供 `events`、`activeEvents`、`loading`、`error`、`lastUpdatedAt`、`refresh`
- 支援 `activeStatuses` 與 `includeTypes` 的前端過濾

### 近期改動 / Recent changes
- `useBackendResidentSnapshot.ts` 已移除
- `useResidentEditor.ts` 已移除
- resident snapshot 流程改由 `shared/resident-live-store.tsx`

### 工作流 / Workflow
1. 元件建立 `useBackendEvents(options)`
2. hook 在 mount 時抓一次事件
3. 若 `pollIntervalMs > 0`，建立 interval 持續輪詢

### 資料流或互動流 / Data flow or interaction flow
- `eventApi.list({ limit })` -> hook state -> `BackendAlertsPanel` / `EmergencyAlertModal` / `LocationDashboard`

### 與後端整合方式 / Integration with backend
- 目前只整合 `eventApi.list()`
- 多個 event status 會先抓再前端過濾

### 狀態管理方式 / State management
- hook 內 local state

### 多語系處理 / i18n
- hook 本身不做 i18n

### 測試方式 / Testing
- 無直接 unit test
- 透過使用它的元件在 Playwright 中間接驗證

### 維護注意事項 / Maintenance notes
- backend 若支援更精準 filter，應先簡化這個 hook
- 若改成 SSE/WebSocket，這裡會是自然替換點

### 目前限制 / Known limitations
- 仍是 polling
- 沒有 abort controller
- 多個 consumer 可能產生多份輪詢

### 已移除或棄用項目 / Deprecated or removed items
- `useBackendResidentSnapshot.ts`
- `useResidentEditor.ts`

### 建議閱讀順序 / Suggested reading order
1. `useBackendEvents.ts`
2. `../components/BackendAlertsPanel.tsx`
3. `../components/EmergencyAlertModal.tsx`
4. `../components/LocationDashboard.tsx`

## English Overview

### Purpose
`src/hooks/` now only keeps hooks that are still active and reused by multiple components. The folder was heavily reduced during the current cleanup.

### What exists here
- `useBackendEvents.ts`

### Key files and responsibilities
- Polls `/api/v1/events`
- Exposes `events`, `activeEvents`, `loading`, `error`, `lastUpdatedAt`, and `refresh`
- Supports client-side filtering by `activeStatuses` and `includeTypes`

### Recent changes
- `useBackendResidentSnapshot.ts` was removed
- `useResidentEditor.ts` was removed
- Resident snapshot loading moved to `shared/resident-live-store.tsx`

### Workflow
1. A component creates `useBackendEvents(options)`
2. The hook fetches events once on mount
3. If `pollIntervalMs > 0`, it schedules an interval to keep polling

### Data flow or interaction flow
- `eventApi.list({ limit })` -> hook state -> `BackendAlertsPanel` / `EmergencyAlertModal` / `LocationDashboard`

### Integration with backend
- The hook currently integrates only with `eventApi.list()`
- Multiple event statuses are handled through client-side filtering

### State management
- Local hook state only

### i18n
- The hook itself is not translated

### Testing
- No dedicated unit tests exist
- Behavior is validated indirectly through Playwright coverage on consuming components

### Maintenance notes
- If the backend later supports richer event filters, simplify this hook first
- If the app moves to SSE or WebSocket, this hook is the natural replacement point

### Known limitations
- Still polling-based
- No abort controller
- Multiple consumers may create multiple polling loops

### Deprecated or removed items
- `useBackendResidentSnapshot.ts`
- `useResidentEditor.ts`

### Suggested reading order
1. `useBackendEvents.ts`
2. `../components/BackendAlertsPanel.tsx`
3. `../components/EmergencyAlertModal.tsx`
4. `../components/LocationDashboard.tsx`
