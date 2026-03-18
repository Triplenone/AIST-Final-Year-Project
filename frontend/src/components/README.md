# Components

## 中文說明

### 目的
`src/components/` 放的是面向畫面的 React 元件。這裡不只是純展示層，部分元件也直接負責 feature-local fetch、事件輪詢結果呈現與使用者互動。

### English Overview
`src/components/` contains the React UI components. This folder is not purely presentational; several components also own feature-local fetching, event rendering, and user interaction logic.

### 此目錄包含什麼 / What exists here
- `LanguageSwitcher.tsx`
- `LocationDashboard.tsx`
- `BackendAlertsPanel.tsx`
- `EmergencyAlertModal.tsx`
- `PushNotificationPanel.tsx`
- `admin/`
- `charts/`

### 核心檔案與責任 / Key files and responsibilities
- `LanguageSwitcher.tsx`
  - 切換 `i18next` 語言，讓整個 UI 重渲染。
- `LocationDashboard.tsx`
  - 位置模組主體，抓 locations / geofence events，畫 indoor floorplan 與 outdoor map。
- `BackendAlertsPanel.tsx`
  - 顯示排序後的 backend alerts，並提供處理按鈕。
- `EmergencyAlertModal.tsx`
  - 顯示高優先級 active event 的全螢幕彈窗。
- `PushNotificationPanel.tsx`
  - 管理 Web Push 訂閱。

### 近期改動 / Recent changes
- 新增 `BackendAlertsPanel.tsx`、`EmergencyAlertModal.tsx`、`PushNotificationPanel.tsx`。
- 移除 `DevPanel.tsx`。
- 移除 `SimulatorControls.tsx`。

### 工作流 / Workflow
1. `App.tsx` 匯入此目錄中的主要元件。
2. 共享資料由 `useResidentLiveStore()` 提供。
3. 事件資料由 `useBackendEvents()` 提供。
4. 元件需要額外資料時，直接經由 `services/api.ts` 讀取。

### 資料流或互動流 / Data flow or interaction flow
- `useResidentLiveStore` -> `LocationDashboard`、`BackendAlertsPanel`
- `useBackendEvents` -> `BackendAlertsPanel`、`EmergencyAlertModal`、`LocationDashboard`
- 使用者處理事件 -> `eventApi.handle`

### 與後端整合方式 / Integration with backend
- `LocationDashboard.tsx` 使用 `locationApi` 與 `eventApi`
- `BackendAlertsPanel.tsx` 使用 `locationApi` 與 `eventApi`
- `EmergencyAlertModal.tsx` 使用 `residentApi`、`locationApi`、`deviceApi`、`eventApi`
- `PushNotificationPanel.tsx` 使用 `pushSubscriptionApi`

### 狀態管理方式 / State management
- 共享狀態靠 context 與 hook。
- loading、error、handling、subscription 等由元件 local state 管理。

### 多語系處理 / i18n
- 多數主要元件走 `useTranslation()`。
- 部分新圖表與 admin 邊角區塊仍有硬編碼英文或 legacy 字串。

### 測試方式 / Testing
- Playwright 會覆蓋 alert、emergency modal、outdoor geofence 與 admin tab 流程。

### 維護注意事項 / Maintenance notes
- 需要 resident snapshot 時優先讀 `useResidentLiveStore()`，不要再各自抓 `/residents`。
- 需要共用事件輪詢時優先沿用 `useBackendEvents()`。

### 目前限制 / Known limitations
- `LocationDashboard.tsx` 與 `EmergencyAlertModal.tsx` 功能較重。
- 部分字串品質不一致。

### 已移除或棄用項目 / Deprecated or removed items
- `DevPanel.tsx`
- `SimulatorControls.tsx`

### 建議閱讀順序 / Suggested reading order
1. `LanguageSwitcher.tsx`
2. `BackendAlertsPanel.tsx`
3. `EmergencyAlertModal.tsx`
4. `LocationDashboard.tsx`
5. `PushNotificationPanel.tsx`
6. `admin/README.md`
7. `charts/README.md`

## English Overview

### Purpose
`src/components/` contains the runtime React UI components. The folder is not purely presentational; several components also own feature-local data fetching, event handling, and interaction logic.

### What exists here
- `LanguageSwitcher.tsx`
- `LocationDashboard.tsx`
- `BackendAlertsPanel.tsx`
- `EmergencyAlertModal.tsx`
- `PushNotificationPanel.tsx`
- `admin/`
- `charts/`

### Key files and responsibilities
- `LanguageSwitcher.tsx`
  - Switches the active i18next language.
- `LocationDashboard.tsx`
  - Owns location fetches, geofence rendering, and indoor/outdoor map behavior.
- `BackendAlertsPanel.tsx`
  - Renders prioritized backend alerts with handling actions.
- `EmergencyAlertModal.tsx`
  - Promotes the most urgent active event into a full-screen modal.
- `PushNotificationPanel.tsx`
  - Owns browser push subscription management.

### Recent changes
- Added `BackendAlertsPanel.tsx`, `EmergencyAlertModal.tsx`, and `PushNotificationPanel.tsx`.
- Removed `DevPanel.tsx`.
- Removed `SimulatorControls.tsx`.

### Workflow
1. `App.tsx` imports the main components from this folder.
2. Shared resident data comes from `useResidentLiveStore()`.
3. Event data comes from `useBackendEvents()`.
4. Components fetch extra backend data through `services/api.ts` when needed.

### Data flow or interaction flow
- `useResidentLiveStore` -> `LocationDashboard`, `BackendAlertsPanel`
- `useBackendEvents` -> `BackendAlertsPanel`, `EmergencyAlertModal`, `LocationDashboard`
- User event actions -> `eventApi.handle`

### Integration with backend
- `LocationDashboard.tsx` uses `locationApi` and `eventApi`
- `BackendAlertsPanel.tsx` uses `locationApi` and `eventApi`
- `EmergencyAlertModal.tsx` uses `residentApi`, `locationApi`, `deviceApi`, and `eventApi`
- `PushNotificationPanel.tsx` uses `pushSubscriptionApi`

### State management
- Shared state comes from context and reusable hooks.
- Loading, error, handling, and subscription details are managed locally.

### i18n
- Most major components use `useTranslation()`.
- Some chart and admin-adjacent labels are still hard-coded.

### Testing
- Playwright covers alerts, the emergency modal, outdoor geofence flows, and admin tab navigation.

### Maintenance notes
- Prefer `useResidentLiveStore()` over creating another resident fetch.
- Reuse `useBackendEvents()` whenever a feature needs the same event polling.

### Known limitations
- `LocationDashboard.tsx` and `EmergencyAlertModal.tsx` remain heavy components.
- String quality is still inconsistent in some areas.

### Deprecated or removed items
- `DevPanel.tsx`
- `SimulatorControls.tsx`

### Suggested reading order
1. `LanguageSwitcher.tsx`
2. `BackendAlertsPanel.tsx`
3. `EmergencyAlertModal.tsx`
4. `LocationDashboard.tsx`
5. `PushNotificationPanel.tsx`
6. `admin/README.md`
7. `charts/README.md`
