# Public Assets

## 中文說明

### 目的
`public/` 存放 Vite 會原樣輸出的靜態檔案。這些檔案不經過 TypeScript 或 bundler 轉換，前端會用固定 URL 直接引用。

### English Overview
`public/` stores static files that Vite copies as-is. These assets are not compiled by TypeScript or transformed by the bundler, and the app references them through fixed public URLs.

### 此目錄包含什麼 / What exists here
- `indoor-nursing-home-map.png`
- `push-sw.js`
- `.gitkeep`

### 核心檔案與責任 / Key files and responsibilities
- `indoor-nursing-home-map.png`
  - 提供 `LocationDashboard.tsx` 的室內底圖。
- `push-sw.js`
  - 提供 browser push notification service worker。

### 近期改動 / Recent changes
- `sse-sw.js` 已被移除。
- `push-sw.js` 是目前唯一有效的 service worker。

### 工作流 / Workflow
1. Vite 將這些檔案原樣暴露。
2. `LocationDashboard.tsx` 直接讀 `/indoor-nursing-home-map.png`。
3. `PushNotificationPanel.tsx` 直接註冊 `/push-sw.js`。

### 資料流或互動流 / Data flow or interaction flow
- push payload -> `push-sw.js` -> notification -> 導回 `/#operations`
- map image -> `LocationDashboard` -> indoor overlay 背景

### 與後端整合方式 / Integration with backend
- service worker 不直接打 backend，但要配合 backend 發送的 push payload。
- 地圖圖片不依賴 backend；真正位置 shape 由 backend geofence API 提供。

### 狀態管理方式 / State management
- 不管理 React state。

### 多語系處理 / i18n
- service worker 不載入 i18n。

### 測試方式 / Testing
- 透過 `PushNotificationPanel` 與 `LocationDashboard` 人工驗證。

### 維護注意事項 / Maintenance notes
- 更換地圖圖片時，需同步確認座標與圖片比例。
- 更換 push worker 行為時，需同步檢查 `PushNotificationPanel.tsx`。

### 目前限制 / Known limitations
- `push-sw.js` 文案完全由 payload 決定。

### 已移除或棄用項目 / Deprecated or removed items
- `sse-sw.js` 已移除。

### 建議閱讀順序 / Suggested reading order
1. `push-sw.js`
2. `../src/components/PushNotificationPanel.tsx`
3. `../src/components/LocationDashboard.tsx`

## English Overview

### Purpose
`public/` contains static files that Vite serves directly. These files bypass the TypeScript toolchain and are referenced by stable public URLs.

### What exists here
- `indoor-nursing-home-map.png`
- `push-sw.js`
- `.gitkeep`

### Key files and responsibilities
- `indoor-nursing-home-map.png`
  - Provides the indoor floorplan asset used by `LocationDashboard.tsx`.
- `push-sw.js`
  - Provides the browser push notification service worker.

### Recent changes
- `sse-sw.js` was removed.
- `push-sw.js` is now the only active service worker.

### Workflow
1. Vite serves these files as-is.
2. `LocationDashboard.tsx` loads `/indoor-nursing-home-map.png`.
3. `PushNotificationPanel.tsx` registers `/push-sw.js`.

### Data flow or interaction flow
- push payload -> `push-sw.js` -> notification -> route back to `/#operations`
- map image -> `LocationDashboard` -> indoor background overlay

### Integration with backend
- The service worker does not call the backend directly, but it depends on backend-delivered push payloads.
- The floorplan image itself is static; backend APIs provide the live geofence shapes rendered on top of it.

### State management
- No React state is managed here.

### i18n
- The service worker does not load frontend i18n resources.

### Testing
- Validate behavior manually through `PushNotificationPanel` and `LocationDashboard`.

### Maintenance notes
- If the floorplan image changes, verify coordinate alignment against the image dimensions.
- If push worker behavior changes, inspect `PushNotificationPanel.tsx` as well.

### Known limitations
- `push-sw.js` content is fully payload-driven.

### Deprecated or removed items
- `sse-sw.js` has been removed.

### Suggested reading order
1. `push-sw.js`
2. `../src/components/PushNotificationPanel.tsx`
3. `../src/components/LocationDashboard.tsx`
