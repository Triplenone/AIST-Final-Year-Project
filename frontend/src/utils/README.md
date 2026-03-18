# Utilities

## 中文說明

### 目的
`src/utils/` 放不依賴 React 的邏輯工具，目前分成 resident 派生計算與 geofence 幾何解析兩類。

### English Overview
`src/utils/` contains non-React helper logic. The current utilities cover resident-derived calculations and geofence geometry parsing.

### 此目錄包含什麼 / What exists here
- `resident-derived.ts`
- `geo.ts`

### 核心檔案與責任 / Key files and responsibilities
- `resident-derived.ts`
  - 計算 KPI
  - 產生 resident-based alerts 與 insights
  - 提供 timestamp / status helper
- `geo.ts`
  - 解析 `geofence_coordinates`
  - 推斷 `lng,lat` 或 `lat,lng`
  - 計算 polygon bounds 與 centroid

### 近期改動 / Recent changes
- `resident-derived.ts` 已集中 KPI、alert、insight 推導
- `geo.ts` 支援 `geo` 與 `indoor` 兩種 mode

### 工作流 / Workflow
- resident snapshot 進來後，`App.tsx` 呼叫 `resident-derived.ts`
- `LocationDashboard.tsx` 取得 geofence 字串後，呼叫 `geo.ts`

### 資料流或互動流 / Data flow or interaction flow
- `Resident[]` -> KPI / insights / alerts
- geofence string -> polygon -> bounds / centroid -> map overlays

### 與後端整合方式 / Integration with backend
- 不直接打 backend
- 完全依賴 backend 回傳的 resident 值與 geofence 字串形狀

### 狀態管理方式 / State management
- 全部為純函式

### 多語系處理 / i18n
- `resident-derived.ts` 接收 `t`
- `geo.ts` 不處理 i18n

### 測試方式 / Testing
- 目前沒有專屬 unit test

### 維護注意事項 / Maintenance notes
- 調整 resident score 會影響整個首頁 KPI 與 insights
- `geo.ts` 的座標順序判斷是 heuristic

### 目前限制 / Known limitations
- `resident-derived.ts` 對缺值使用 fallback
- `geo.ts` 對邊界格式敏感

### 已移除或棄用項目 / Deprecated or removed items
- 沒有保留的舊 util 檔案

### 建議閱讀順序 / Suggested reading order
1. `resident-derived.ts`
2. `geo.ts`
3. `../App.tsx`
4. `../components/LocationDashboard.tsx`

## English Overview

### Purpose
`src/utils/` contains non-React helper logic. The current utilities cover resident-derived calculations and geofence geometry parsing.

### What exists here
- `resident-derived.ts`
- `geo.ts`

### Key files and responsibilities
- `resident-derived.ts`
  - Computes KPI values
  - Generates resident-based alerts and insights
  - Provides timestamp and status helpers
- `geo.ts`
  - Parses `geofence_coordinates`
  - Infers `lng,lat` or `lat,lng`
  - Computes polygon bounds and centroids

### Recent changes
- `resident-derived.ts` now centralizes KPI, alert, and insight derivation
- `geo.ts` supports both `geo` and `indoor` modes

### Workflow
- `App.tsx` calls `resident-derived.ts` after the resident snapshot is loaded
- `LocationDashboard.tsx` calls `geo.ts` after geofence strings are loaded

### Data flow or interaction flow
- `Resident[]` -> KPI / insights / alerts
- geofence string -> polygon -> bounds / centroid -> map overlays

### Integration with backend
- No direct backend calls
- Fully depends on backend-provided resident values and geofence string shapes

### State management
- All helpers are pure functions

### i18n
- `resident-derived.ts` receives `t`
- `geo.ts` does not deal with translation

### Testing
- There are currently no dedicated unit tests

### Maintenance notes
- Changing resident scoring affects the homepage KPI and insight output
- `geo.ts` uses heuristics for coordinate ordering

### Known limitations
- `resident-derived.ts` uses fallbacks for missing data
- `geo.ts` is sensitive to edge-case coordinate formats

### Deprecated or removed items
- No legacy utility files remain

### Suggested reading order
1. `resident-derived.ts`
2. `geo.ts`
3. `../App.tsx`
4. `../components/LocationDashboard.tsx`
