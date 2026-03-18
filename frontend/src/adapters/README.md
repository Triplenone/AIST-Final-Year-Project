# Adapters

## 中文說明

### 目的
`src/adapters/` 是 backend DTO 與前端 UI model 的邊界。backend shape 先進 `types/backend.ts`，再由 adapter 決定 UI 實際消費的結構。

### English Overview
`src/adapters/` is the boundary between backend DTOs and frontend UI models. Backend schema changes should land in `types/backend.ts` first, and adapters decide what shape the UI actually consumes.

### 此目錄包含什麼 / What exists here
- `residents.ts`

### 核心檔案與責任 / Key files and responsibilities
- `BackendResident` -> `Resident`
- vitals 缺值安全預設
- room / lastSeenLocation fallback 邏輯
- `origin: 'db'` 標記

### 近期改動 / Recent changes
- 現在會優先使用 backend 聚合欄位與 `device_deploy_location` 作為 fallback

### 工作流 / Workflow
1. `residentApi.list()` 取得 `BackendResident[]`
2. `mapBackendResidents()` 轉為 `Resident[]`
3. `ResidentLiveProvider` 存進 context

### 資料流或互動流 / Data flow or interaction flow
- backend DTO -> adapter -> UI model -> context / components

### 與後端整合方式 / Integration with backend
- 本目錄不直接呼叫 backend
- 但依賴 `BackendResident` 的欄位命名與聚合欄位存在

### 狀態管理方式 / State management
- 純函式、無狀態

### 多語系處理 / i18n
- 不處理翻譯

### 測試方式 / Testing
- 目前沒有獨立 adapter unit tests

### 維護注意事項 / Maintenance notes
- backend resident schema 變動先改 `types/backend.ts` 再檢查這裡
- vitals 預設值會影響 KPI 與 alerts 推導

### 目前限制 / Known limitations
- 對缺值套用預設數值可能掩蓋資料缺失

### 已移除或棄用項目 / Deprecated or removed items
- 沒有舊 adapter 保留

### 建議閱讀順序 / Suggested reading order
1. `residents.ts`
2. `../types/backend.ts`
3. `../types/resident.ts`
4. `../shared/resident-live-store.tsx`

## English Overview

### Purpose
`src/adapters/` is the boundary between backend DTOs and frontend UI models. Backend schema changes should land in `types/backend.ts` first, and the adapter decides what the UI actually consumes.

### What exists here
- `residents.ts`

### Key files and responsibilities
- Converts `BackendResident` into `Resident`
- Applies safe defaults for missing vitals
- Defines room and location fallback logic
- Marks `origin: 'db'`

### Recent changes
- Fallback logic now prefers backend aggregate fields and `device_deploy_location`

### Workflow
1. `residentApi.list()` loads `BackendResident[]`
2. `mapBackendResidents()` converts them into `Resident[]`
3. `ResidentLiveProvider` stores the converted residents in context

### Data flow or interaction flow
- backend DTO -> adapter -> UI model -> context / components

### Integration with backend
- This folder does not call the backend directly
- It depends on `BackendResident` field names and aggregate fields

### State management
- Stateless and functional

### i18n
- No translation logic

### Testing
- No dedicated adapter unit tests currently exist

### Maintenance notes
- Update `types/backend.ts` first when the backend resident schema changes
- Vital defaults affect KPI and alert derivation

### Known limitations
- Default numeric fallbacks can hide real data gaps

### Deprecated or removed items
- No legacy adapters remain here

### Suggested reading order
1. `residents.ts`
2. `../types/backend.ts`
3. `../types/resident.ts`
4. `../shared/resident-live-store.tsx`
