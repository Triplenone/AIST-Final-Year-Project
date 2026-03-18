# SSE Status

## 中文說明

### 目的
`src/sse/` 目前不是活躍功能資料夾。保留這個目錄的主要原因，是明確記錄舊 SSE client 已被移除，避免新成員誤判這裡仍有執行時邏輯。

### English Overview
`src/sse/` is no longer an active feature folder. It is kept mainly to document that the older SSE client has been removed so new contributors do not assume runtime logic still lives here.

### 此目錄包含什麼 / What exists here
- 只有本 README.md

### 核心檔案與責任 / Key files and responsibilities
- 無執行時程式碼
- 文件負責交代目前 SSE 已停用的現況

### 近期改動 / Recent changes
- `src/sse/client.ts` 已刪除
- resident 更新改由 `ResidentLiveProvider` 輪詢
- event 更新改由 `useBackendEvents` 輪詢

### 工作流 / Workflow
- 無 active workflow

### 資料流或互動流 / Data flow or interaction flow
- 不存在 SSE 資料流
- 目前由 polling 取代：
  - residents -> `shared/resident-live-store.tsx`
  - events -> `hooks/useBackendEvents.ts`

### 與後端整合方式 / Integration with backend
- 目前沒有 SSE / EventSource 整合

### 狀態管理方式 / State management
- 不適用

### 多語系處理 / i18n
- 不適用

### 測試方式 / Testing
- 不適用

### 維護注意事項 / Maintenance notes
- 若未來重新引入 SSE / WebSocket，不應直接假設沿用舊資料夾設計

### 目前限制 / Known limitations
- 即時性完全依賴 polling interval

### 已移除或棄用項目 / Deprecated or removed items
- `client.ts`

### 建議閱讀順序 / Suggested reading order
1. `../shared/resident-live-store.tsx`
2. `../hooks/useBackendEvents.ts`
3. `../services/api.ts`

## English Overview

### Purpose
`src/sse/` is no longer an active feature folder. It remains only to document that the older SSE client has been removed so new contributors do not expect runtime code here.

### What exists here
- Only this `README.md`

### Key files and responsibilities
- No runtime code remains here
- The document exists to record that SSE is currently inactive

### Recent changes
- `src/sse/client.ts` was deleted
- Resident updates now rely on `ResidentLiveProvider` polling
- Event updates now rely on `useBackendEvents` polling

### Workflow
- No active workflow remains

### Data flow or interaction flow
- There is no SSE data flow anymore
- Polling replaced it:
  - residents -> `shared/resident-live-store.tsx`
  - events -> `hooks/useBackendEvents.ts`

### Integration with backend
- There is currently no SSE / EventSource integration

### State management
- Not applicable

### i18n
- Not applicable

### Testing
- Not applicable

### Maintenance notes
- If SSE or WebSocket is added again later, do not assume the old folder design should return unchanged

### Known limitations
- Real-time behavior depends entirely on polling intervals

### Deprecated or removed items
- `client.ts`

### Suggested reading order
1. `../shared/resident-live-store.tsx`
2. `../hooks/useBackendEvents.ts`
3. `../services/api.ts`
