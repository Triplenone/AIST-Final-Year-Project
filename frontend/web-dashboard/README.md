# SmartCare Web Dashboard / 智慧照護儀表板

## Overview (English)
This standalone HTML/CSS/JavaScript dashboard mimics the Smart Elderly Care portal. It ships with client-side auth, resident CRUD, staffing controls, family messaging, theme + language toggles, and data export so UX demos are fully interactive without a backend.

## 概要（繁體中文）
此儀表板以純前端方式重現智慧長照平台，內建登入/註冊、住民管理、人力調整、家屬訊息、語言與主題切換及匯出功能，方便在尚未串接後端前完整展示操作情境。

---

## Key Features / 主要功能
- **Care Overview**：動態指標卡、建議介入、最近警報（Admin 可即時編輯）。
- **Resident Directory**：搜尋、快速篩選、住民新增／編輯／刪除，資料保存於瀏覽器。
- **Facility Operations**：床位佔用、排程下載、Admin 專屬「Adjust Staffing」。
- **Family Engagement**：訊息中心、探視日程、分享連結、登入後可新增訊息。
- **Auth & Localization**：預設 Admin/Caregiver 帳號、看護者註冊、Light/Dark、EN／繁／简 語言切換。

## Quick Start
1. `cd frontend/web-dashboard`
2. `python -m http.server 5500`
3. 開啟 http://localhost:5500（按 `Ctrl + F5` 強制刷新）
4. 登入帳號：Admin/admin 或 Ms.Testing/admin；亦可在登入窗點 Sign up 建立新看護者

### Configuration / 設定
- 調整 `app-config.js` 以控制執行模式：
  - `dataMode: 'local'`（預設）→ 全部資料留在瀏覽器 `localStorage`。
  - `dataMode: 'api'`（預備）→ 代表要走後端 API；需在 `data-layer.js` 的 API adapter 中實作 `fetch/axios`。
- `apiBase` 可預先填入 FastAPI 端點，例如 `http://localhost:8000/api/v1`。

### Accounts / 帳號
| Role 角色 | Username | Password |
|----------|----------|----------|
| Admin 管理員 | `Admin` | `admin` |
| Caregiver 看護者 | `Ms.Testing` | `admin` |
| Sign Up | 於登入視窗選 Sign up | 自訂 |

Admin 具備「Edit Overview / Adjust Staffing」權限；Caregiver 可維護住民與家屬訊息。

## Localization / 語言
- 右上角下拉：EN → English、繁 → 繁體中文、简 → 簡體中文。
- 切換後導覽、標題、副標、表頭與主要按鈕文字即時更新。
- 偏好設定與資料同樣存於 `localStorage`，重新整理不會遺失。

## Integration Tips / 接入提示
1. **Data store abstraction**：所有存取都集中在 `data-layer.js`，透過全域 `DataStore.get/set`。接後端時，只需替換 API adapter（目前僅提示 TODO）。
2. **Config-driven**：`app-config.js` 允許在不改程式的情況下切換 data mode、API base、未來的 JWT token 等參數。
3. **Export hooks**：`scripts.js` 內的 `Generate Report` / `Download Schedule` 皆集中在 `renderResidents` 與 `applyOverview` 邏輯，方便改為真正的 REST 呼叫。
4. **Internationalisation**：新增語言時，擴充 `I18N` 字典即可；也可在 `APP_CONFIG` 預先設定 `locale` 以固定語系。

## Next Steps / 後續建議
1. 實作 `data-layer.js` 的 API adapter（使用 `fetch` / `axios`），並串接 FastAPI endpoints。
2. 在 `frontend/` 目錄啟動 Vite + React PWA（目前為空殼），逐步將模組組件化。
3. 將登入流程改為 JWT（`APP_CONFIG.auth.token` 可作為暫存位置），並與後端 RBAC 對接。
4. 將現有 UI 元件抽離成可重複使用的 `components/`（例如表格、卡片、modal），方便遷移到未來 PWA。
