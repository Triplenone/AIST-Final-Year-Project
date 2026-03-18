# Types

## 中文說明

### 目的
`src/types/` 定義前端最重要的資料契約，把 backend 原始資料形狀與 UI 專用模型分開。

### English Overview
`src/types/` defines the primary data contracts used by the frontend and separates raw backend payloads from UI-facing models.

### 此目錄包含什麼 / What exists here
- `backend.ts`
- `resident.ts`

### 核心檔案與責任 / Key files and responsibilities
- `backend.ts`
  - users、devices、locations、events、user status、device data log、resident aggregate、KPI、push subscription DTO
- `resident.ts`
  - 前端實際使用的 `Resident` 與 `ResidentVitals`

### 近期改動 / Recent changes
- `backend.ts` 已包含 push subscription 相關型別
- `resident.ts` 成為 resident live store 與 UI 的共同模型

### 工作流 / Workflow
1. backend 回應先對照 `Backend*`
2. adapter 將 `BackendResident` 轉成 `Resident`
3. components 與 utilities 主要依賴 `Resident`

### 資料流或互動流 / Data flow or interaction flow
- backend schema -> `Backend*` interface -> adapter / API layer -> `Resident` or raw DTO consumer

### 與後端整合方式 / Integration with backend
- backend 欄位調整時，這裡是第一個要更新的地方

### 狀態管理方式 / State management
- 此目錄不管理狀態

### 多語系處理 / i18n
- 不處理翻譯

### 測試方式 / Testing
- 主要由 TypeScript 編譯與使用處間接驗證

### 維護注意事項 / Maintenance notes
- `BackendResident` 目前仍保留聚合欄位與重複 `role_type` 宣告，這是現況

### 目前限制 / Known limitations
- `backend.ts` 同時承擔很多資源型別，檔案偏大

### 已移除或棄用項目 / Deprecated or removed items
- 沒有額外保留的舊型別檔

### 建議閱讀順序 / Suggested reading order
1. `backend.ts`
2. `resident.ts`
3. `../adapters/residents.ts`

## English Overview

### Purpose
`src/types/` defines the main data contracts used by the frontend and separates raw backend DTOs from UI-facing models.

### What exists here
- `backend.ts`
- `resident.ts`

### Key files and responsibilities
- `backend.ts`
  - DTOs for users, devices, locations, events, user status, device logs, resident aggregates, KPI, and push subscriptions
- `resident.ts`
  - The `Resident` and `ResidentVitals` model used by the UI

### Recent changes
- `backend.ts` now includes push subscription types
- `resident.ts` is the shared model used by the resident live store and the UI

### Workflow
1. Backend responses are typed as `Backend*`
2. The adapter converts `BackendResident` into `Resident`
3. Components and utilities mainly consume `Resident`

### Data flow or interaction flow
- backend schema -> `Backend*` interface -> adapter / API layer -> `Resident` or raw DTO consumer

### Integration with backend
- This is the first folder to update when backend fields change

### State management
- This folder manages no state

### i18n
- No translation logic lives here

### Testing
- Mainly validated by TypeScript compilation and downstream consumers

### Maintenance notes
- `BackendResident` still carries aggregate fields and a duplicated `role_type` declaration; that is the real current state

### Known limitations
- `backend.ts` is large because it owns many resource contracts

### Deprecated or removed items
- No separate legacy type files remain

### Suggested reading order
1. `backend.ts`
2. `resident.ts`
3. `../adapters/residents.ts`
