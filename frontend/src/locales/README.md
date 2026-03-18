# Locales

## 中文說明

### 目的
`src/locales/` 存放前端目前使用的靜態翻譯字典。所有字典都在 build 時被打包進前端。

### English Overview
`src/locales/` stores the static translation dictionaries used by the frontend. All dictionaries are bundled into the application at build time.

### 此目錄包含什麼 / What exists here
- `en/translation.json`
- `zh-HK/translation.json`
- `zh-CN/translation.json`

### 核心檔案與責任 / Key files and responsibilities
- `en/translation.json`
  - English baseline dictionary
- `zh-HK/translation.json`
  - Traditional Chinese dictionary
- `zh-CN/translation.json`
  - Simplified Chinese dictionary

### 近期改動 / Recent changes
- 已新增 location、alerts、emergency、push、admin residents 等相關 key
- admin 區仍有部分硬編碼字串未導入

### 工作流 / Workflow
1. `i18n.ts` 靜態匯入三份 JSON
2. i18next 啟動時註冊 resources
3. component 透過 `useTranslation()` 取值

### 資料流或互動流 / Data flow or interaction flow
- translation JSON -> `i18n.ts` -> `useTranslation()` -> UI render

### 與後端整合方式 / Integration with backend
- 不直接與 backend 整合
- backend 狀態值通常在元件裡轉成 translation key

### 狀態管理方式 / State management
- 語言偏好由 i18next 與 browser language detector 管理

### 多語系處理 / i18n
- 這個目錄本身就是 i18n 來源

### 測試方式 / Testing
- Playwright 會先把 `i18nextLng` 設成 `en`

### 維護注意事項 / Maintenance notes
- 新增 UI 文案時三份字典應同步更新

### 目前限制 / Known limitations
- admin 面板仍有未翻譯字串

### 已移除或棄用項目 / Deprecated or removed items
- 舊 `web-dashboard` 的 i18n 資源已隨該方案移除

### 建議閱讀順序 / Suggested reading order
1. `../i18n.ts`
2. `en/translation.json`
3. `zh-HK/translation.json`
4. `zh-CN/translation.json`

## English Overview

### Purpose
`src/locales/` stores the static translation dictionaries used by the frontend. All resources are bundled into the app during build time.

### What exists here
- `en/translation.json`
- `zh-HK/translation.json`
- `zh-CN/translation.json`

### Key files and responsibilities
- `en/translation.json`
  - English baseline dictionary
- `zh-HK/translation.json`
  - Traditional Chinese dictionary
- `zh-CN/translation.json`
  - Simplified Chinese dictionary

### Recent changes
- Added keys for location, alerts, emergency, push, and admin resident views
- Some admin strings are still hard-coded

### Workflow
1. `i18n.ts` statically imports the three JSON files
2. i18next registers them at startup
3. Components read values through `useTranslation()`

### Data flow or interaction flow
- translation JSON -> `i18n.ts` -> `useTranslation()` -> UI render

### Integration with backend
- No direct backend integration
- Backend state values are usually converted into translation keys inside components

### State management
- Language preference is managed by i18next and the browser language detector

### i18n
- This folder is the i18n source itself

### Testing
- Playwright forces `i18nextLng = en` for stable selectors

### Maintenance notes
- Update all three dictionaries together when new UI copy is introduced

### Known limitations
- Some admin-facing strings remain untranslated

### Deprecated or removed items
- The legacy `web-dashboard` i18n resources were removed with that frontend

### Suggested reading order
1. `../i18n.ts`
2. `en/translation.json`
3. `zh-HK/translation.json`
4. `zh-CN/translation.json`
