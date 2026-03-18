# Shared State

## 中文說明

### 目的
`src/shared/` 放跨畫面、跨元件需要共享的狀態。目前唯一的共享狀態是 resident live store。

### English Overview
`src/shared/` contains state that must be shared across screens and components. The only shared module today is the resident live store.

### 此目錄包含什麼 / What exists here
- `resident-live-store.tsx`

### 核心檔案與責任 / Key files and responsibilities
- 建立 `ResidentLiveContext`
- mount 時抓取 resident 清單
- 每 10 秒自動刷新
- 維護 `connected`、`loading`、`error`、`lastUpdatedAt`

### 近期改動 / Recent changes
- 舊 resident snapshot hook 已移除，改由此 provider 作為唯一 resident 資料入口
- 不再使用前端自建 SSE client

### 工作流 / Workflow
1. `main.tsx` 用 `ResidentLiveProvider` 包住 app
2. provider 呼叫 `residentApi.list({ limit: 500 })`
3. 透過 `mapBackendResidents()` 轉成 UI model
4. context 將資料提供給 `App.tsx` 與相關元件

### 資料流或互動流 / Data flow or interaction flow
- `/api/v1/residents` -> adapter -> context store -> dashboard / map / alerts / charts

### 與後端整合方式 / Integration with backend
- 只整合 `residentApi.list`
- 每次刷新都是整包覆蓋

### 狀態管理方式 / State management
- React Context + local state

### 多語系處理 / i18n
- store 本身不處理翻譯

### 測試方式 / Testing
- 目前沒有 shared store 單元測試
- 行為透過整體 UI 與 E2E 間接驗證

### 維護注意事項 / Maintenance notes
- resident payload 變更時，務必同步檢查 adapter 與 consumers

### 目前限制 / Known limitations
- 每 10 秒整包輪詢
- 目前只共享 resident 資料

### 已移除或棄用項目 / Deprecated or removed items
- `useBackendResidentSnapshot.ts`
- 舊 `src/sse/client.ts`

### 建議閱讀順序 / Suggested reading order
1. `resident-live-store.tsx`
2. `../adapters/residents.ts`
3. `../App.tsx`

## English Overview

### Purpose
`src/shared/` contains state that must be shared across multiple parts of the app. The only shared module today is the resident live store.

### What exists here
- `resident-live-store.tsx`

### Key files and responsibilities
- Creates `ResidentLiveContext`
- Loads the resident list on mount
- Polls every 10 seconds
- Tracks `connected`, `loading`, `error`, and `lastUpdatedAt`

### Recent changes
- The older resident snapshot hook was removed and replaced by this provider
- The frontend no longer relies on its own SSE client

### Workflow
1. `main.tsx` wraps the app in `ResidentLiveProvider`
2. The provider calls `residentApi.list({ limit: 500 })`
3. `mapBackendResidents()` converts the payload into the UI model
4. Context exposes that data to `App.tsx` and other consumers

### Data flow or interaction flow
- `/api/v1/residents` -> adapter -> context store -> dashboard / map / alerts / charts

### Integration with backend
- Integrates only with `residentApi.list`
- Every refresh replaces the full snapshot

### State management
- React Context plus local state

### i18n
- The store does not own translations

### Testing
- No dedicated store unit tests exist
- Behavior is validated indirectly through UI and E2E flows

### Maintenance notes
- Revisit the adapter and all consumers whenever the resident payload changes

### Known limitations
- Polls the full resident set every 10 seconds
- Only resident data is shared globally

### Deprecated or removed items
- `useBackendResidentSnapshot.ts`
- the old `src/sse/client.ts`

### Suggested reading order
1. `resident-live-store.tsx`
2. `../adapters/residents.ts`
3. `../App.tsx`
