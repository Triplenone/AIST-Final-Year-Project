# Styles

## 中文說明

### 目的
`src/styles/` 放前端目前仍在使用的 CSS。專案沒有採用 CSS Modules，而是用少量大型樣式檔配合元件匯入方式管理。

### English Overview
`src/styles/` contains the CSS used by the current frontend. The project does not use CSS Modules; it relies on a few larger style sheets imported by components.

### 此目錄包含什麼 / What exists here
- `global.css`
- `charts.css`
- `location-map.css`

### 核心檔案與責任 / Key files and responsibilities
- `global.css`
  - theme variables、layout shell、hero、metrics、admin、alerts、push、modal
- `charts.css`
  - chart card 與 IMU waveform 樣式
- `location-map.css`
  - 位置地圖、legend、occupancy、breach list 樣式

### 近期改動 / Recent changes
- 新 alert / push / admin / chart 功能讓 `global.css` 成為最大樣式檔
- 舊 `frontend/web-dashboard/styles.css` 已移除

### 工作流 / Workflow
- `App.tsx` 匯入 `global.css`
- chart components 匯入 `charts.css`
- `LocationDashboard.tsx` 匯入 `location-map.css`

### 資料流或互動流 / Data flow or interaction flow
- CSS 不處理資料流，但 class name 與元件 DOM 結構緊密耦合

### 與後端整合方式 / Integration with backend
- 無直接 backend 整合

### 狀態管理方式 / State management
- theme 由 `App.tsx` 在 `<html>` 上切 `data-theme`
- 其餘樣式狀態主要靠 className

### 多語系處理 / i18n
- CSS 不處理 i18n，但需容納英中不同字長

### 測試方式 / Testing
- 主要靠人工檢查與 Playwright flow 驗證

### 維護注意事項 / Maintenance notes
- 修改 `global.css` 前先搜尋 class 是否被多處共用
- 位置地圖樣式盡量留在 `location-map.css`

### 目前限制 / Known limitations
- 沒有樣式模組隔離
- `global.css` 責任過多

### 已移除或棄用項目 / Deprecated or removed items
- `frontend/web-dashboard/styles.css`

### 建議閱讀順序 / Suggested reading order
1. `global.css`
2. `charts.css`
3. `location-map.css`

## English Overview

### Purpose
`src/styles/` contains the CSS used by the current frontend. The project does not use CSS Modules and instead relies on a small number of larger style sheets.

### What exists here
- `global.css`
- `charts.css`
- `location-map.css`

### Key files and responsibilities
- `global.css`
  - theme variables, layout shell, hero, metrics, admin, alerts, push, and modal styles
- `charts.css`
  - chart-card and IMU waveform styles
- `location-map.css`
  - location dashboard, legend, occupancy, and breach list styles

### Recent changes
- New alert, push, admin, and chart features made `global.css` the largest stylesheet
- The old `frontend/web-dashboard/styles.css` was removed

### Workflow
- `App.tsx` imports `global.css`
- Chart components import `charts.css`
- `LocationDashboard.tsx` imports `location-map.css`

### Data flow or interaction flow
- CSS does not own data flow, but class names are tightly coupled to component DOM

### Integration with backend
- No direct backend integration

### State management
- Theme is controlled through `data-theme` on the root element
- Other style changes mainly depend on class switching

### i18n
- CSS does not implement i18n, but it must handle different text lengths across languages

### Testing
- Mainly validated by manual review and Playwright flows

### Maintenance notes
- Search for a class before changing `global.css`
- Keep map styling in `location-map.css` whenever possible

### Known limitations
- No style isolation
- `global.css` owns too many concerns

### Deprecated or removed items
- `frontend/web-dashboard/styles.css`

### Suggested reading order
1. `global.css`
2. `charts.css`
3. `location-map.css`
