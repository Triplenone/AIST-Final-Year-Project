# Chart Components

## 中文說明

### 目的
`src/components/charts/` 負責 dashboard 內的圖表顯示，分成 resident snapshot 派生圖與 device log 直接驅動圖兩類。

### English Overview
`src/components/charts/` renders the dashboard charts. It currently covers resident-snapshot-derived charts and a direct device-log-driven chart.

### 此目錄包含什麼 / What exists here
- `DashboardCharts.tsx`
- `ImuWaveformChart.tsx`

### 核心檔案與責任 / Key files and responsibilities
- `DashboardCharts.tsx`
  - 接收 `App.tsx` 提供的 pie/bar/line data
- `ImuWaveformChart.tsx`
  - 自行抓裝置日誌並每 2 秒刷新

### 近期改動 / Recent changes
- 新增 `ImuWaveformChart.tsx`
- 樣式集中於 `src/styles/charts.css`

### 工作流 / Workflow
1. `App.tsx` 推導 chart data
2. `DashboardCharts.tsx` 負責視覺化
3. `ImuWaveformChart.tsx` 直接讀 `deviceDataLogApi`

### 資料流或互動流 / Data flow or interaction flow
- resident snapshot -> `DashboardCharts`
- `deviceDataLogApi.list` -> `ImuWaveformChart`

### 與後端整合方式 / Integration with backend
- `DashboardCharts.tsx` 不直接打 backend
- `ImuWaveformChart.tsx` 使用 `deviceDataLogApi`

### 狀態管理方式 / State management
- `DashboardCharts.tsx` 為 props-only component
- `ImuWaveformChart.tsx` 用 local state 管理 `data`、`loading`、`error`

### 多語系處理 / i18n
- `DashboardCharts.tsx` 由上層傳入已翻譯文案
- `ImuWaveformChart.tsx` 仍有英文硬編碼

### 測試方式 / Testing
- 目前無專屬 unit test
- 主要靠人工與整體 E2E 間接驗證

### 維護注意事項 / Maintenance notes
- resident 摘要圖邏輯先改 `utils/resident-derived.ts`
- IMU 資料邏輯先改 `types/backend.ts` 與 `services/api.ts`

### 目前限制 / Known limitations
- `ImuWaveformChart.tsx` API 無資料時會回退到 fallback signal

### 已移除或棄用項目 / Deprecated or removed items
- 舊 `web-dashboard` 圖表流程已淘汰

### 建議閱讀順序 / Suggested reading order
1. `DashboardCharts.tsx`
2. `ImuWaveformChart.tsx`
3. `../../utils/resident-derived.ts`

## English Overview

### Purpose
`src/components/charts/` renders the dashboard charts. It currently covers charts derived from the resident snapshot and one chart driven directly by device logs.

### What exists here
- `DashboardCharts.tsx`
- `ImuWaveformChart.tsx`

### Key files and responsibilities
- `DashboardCharts.tsx`
  - Receives chart series from `App.tsx`
- `ImuWaveformChart.tsx`
  - Fetches device logs and refreshes every 2 seconds

### Recent changes
- Added `ImuWaveformChart.tsx`
- Styling is centralized in `src/styles/charts.css`

### Workflow
1. `App.tsx` derives chart data
2. `DashboardCharts.tsx` visualizes it
3. `ImuWaveformChart.tsx` loads `deviceDataLogApi` directly

### Data flow or interaction flow
- resident snapshot -> `DashboardCharts`
- `deviceDataLogApi.list` -> `ImuWaveformChart`

### Integration with backend
- `DashboardCharts.tsx` does not hit the backend directly
- `ImuWaveformChart.tsx` uses `deviceDataLogApi`

### State management
- `DashboardCharts.tsx` is props-only
- `ImuWaveformChart.tsx` stores `data`, `loading`, and `error` locally

### i18n
- `DashboardCharts.tsx` receives already translated labels from its parent
- `ImuWaveformChart.tsx` still has hard-coded English text

### Testing
- No dedicated unit tests exist
- Validation is mostly manual and indirectly covered by end-to-end flows

### Maintenance notes
- Change resident summary logic in `utils/resident-derived.ts` first
- Change IMU data flow in `types/backend.ts` and `services/api.ts` first

### Known limitations
- `ImuWaveformChart.tsx` falls back to synthetic signal data when the API is empty

### Deprecated or removed items
- The old `web-dashboard` chart flow is retired

### Suggested reading order
1. `DashboardCharts.tsx`
2. `ImuWaveformChart.tsx`
3. `../../utils/resident-derived.ts`
