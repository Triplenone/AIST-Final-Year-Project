# Services

## 中文說明

### 目的
`src/services/` 是前端對 backend 的唯一 HTTP 邊界。這裡目前只有一個 `api.ts`，集中管理所有 API family。

### English Overview
`src/services/` is the single HTTP boundary between the frontend and the backend. The folder currently contains one file, `api.ts`, which centralizes every API family.

### 此目錄包含什麼 / What exists here
- `api.ts`

### 核心檔案與責任 / Key files and responsibilities
- 建立 Axios instance
- 套用 JSON header
- 統一 response interceptor 與錯誤訊息轉換
- 暴露 `userApi`、`deviceApi`、`locationApi`、`eventApi`、`userStatusApi`、`deviceDataLogApi`、`residentApi`、`dataReceptionApi`、`kpiApi`、`pushSubscriptionApi`

### 近期改動 / Recent changes
- 新增 `pushSubscriptionApi`
- 舊 `simulator-controls.ts` 已移除

### 工作流 / Workflow
1. `constants/backend.ts` 提供 `API_BASE_URL`
2. `api.ts` 建立 Axios instance
3. 元件與共享狀態匯入對應 API family

### 資料流或互動流 / Data flow or interaction flow
- caller -> `api.ts` -> backend response -> interceptor unwrap -> caller

### 與後端整合方式 / Integration with backend
- 所有 path 都以 `/api/v1` 為前綴
- `eventApi.handle()` 使用 query params
- `residentApi.getDeviceDataLogs()` 與 `deviceDataLogApi.statistics()` 已反映當前 backend 路由

### 狀態管理方式 / State management
- 不管理 UI state

### 多語系處理 / i18n
- 不處理翻譯
- 錯誤訊息為 backend `detail` 或英文 fallback

### 測試方式 / Testing
- 主要透過整體 UI 與 Playwright 覆蓋

### 維護注意事項 / Maintenance notes
- 不要在 component 內新增另一份 Axios instance
- 新端點先加到 `api.ts`

### 目前限制 / Known limitations
- 單檔管理所有端點
- 沒有 retry / cancellation / request de-duplication

### 已移除或棄用項目 / Deprecated or removed items
- `simulator-controls.ts` 已移除

### 建議閱讀順序 / Suggested reading order
1. `api.ts`
2. `../constants/backend.ts`
3. `../types/backend.ts`

## English Overview

### Purpose
`src/services/` is the only intended HTTP boundary between the frontend and the backend. The folder currently contains one file, `api.ts`, which centralizes every API family.

### What exists here
- `api.ts`

### Key files and responsibilities
- Creates the Axios instance
- Applies JSON headers
- Normalizes responses and errors through a shared interceptor
- Exposes `userApi`, `deviceApi`, `locationApi`, `eventApi`, `userStatusApi`, `deviceDataLogApi`, `residentApi`, `dataReceptionApi`, `kpiApi`, and `pushSubscriptionApi`

### Recent changes
- Added `pushSubscriptionApi`
- Removed the old `simulator-controls.ts`

### Workflow
1. `constants/backend.ts` provides `API_BASE_URL`
2. `api.ts` creates the shared Axios instance
3. Components and shared modules import the API family they need

### Data flow or interaction flow
- caller -> `api.ts` -> backend response -> interceptor unwrap -> caller

### Integration with backend
- Every path is rooted under `/api/v1`
- `eventApi.handle()` sends query parameters
- `residentApi.getDeviceDataLogs()` and `deviceDataLogApi.statistics()` reflect current backend routes

### State management
- No UI state is managed here

### i18n
- No translation logic lives here
- Error text comes from backend `detail` or English fallbacks

### Testing
- Mostly covered through end-to-end flows

### Maintenance notes
- Do not create a second Axios instance inside components
- Add new endpoints to `api.ts` first

### Known limitations
- One file owns the full API surface
- No retry, cancellation, or request de-duplication layer

### Deprecated or removed items
- `simulator-controls.ts` has been removed

### Suggested reading order
1. `api.ts`
2. `../constants/backend.ts`
3. `../types/backend.ts`
