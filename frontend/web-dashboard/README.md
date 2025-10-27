# SmartCare Web Dashboard

## English Version
The legacy dashboard is a standalone HTML/CSS/JavaScript app that demonstrates the SmartCare resident experience with no backend dependency. It supports dual data modes (localStorage vs API/Hybrid via DataGateway), multi-role auth, localization (EN/繁/简 powered by i18next), Light/Dark themes, and JSON export.

### Quick Start
1. `cd frontend/web-dashboard`
2. `python -m http.server 5500`
3. Open `http://localhost:5500` (Ctrl+F5). Sign in with:
   - Admin: `Admin / admin`
   - Caregiver: `Ms.Testing / admin`

### Features
- **Care Overview**: Metrics, interventions, recent alerts (admin can edit cards).
- **Residents**: Search, quick filters, CRUD modal, localized validation, JSON report export.
- **Operations**: Staffing snapshot + admin-only staffing modal using DataGateway state.
- **Family Engagement**: Messages list + composer, share-link copy fallback.
- **Preferences**: Light/Dark, localization, session-aware buttons, accessible modals, aria-live toasts.

### Data Modes
- `dataMode: 'local'`: all data stored in `localStorage`.
- `dataMode: 'api'`: uses FastAPI endpoints defined by `apiBase`.
- `dataMode: 'hybrid'`: renders from cache then syncs via DataGateway.

### Customisation
| Area | Notes |
|------|-------|
| Strings | Update `i18n-resources.js` (i18next resources shared with React). |
| Styling | Update `styles.css` tokens; modals/toasts already centralized. |
| Data layer | Add namespaces or API calls in `data-layer.js`. |
| Export | Modify the JSON payload inside `scripts.js` (Generate Report handler). |

## 繁體中文（香港）版本
此儀表板為純 HTML/CSS/JavaScript 實作，可無後端依賴展示 SmartCare 流程。支援雙資料模式（localStorage 或 API/Hybrid via DataGateway）、多角色登入、英/繁/简 語系（由 i18next 驅動）、明暗主題、JSON 匯出。

### 快速開始
1. `cd frontend/web-dashboard`
2. `python -m http.server 5500`
3. 開啟 `http://localhost:5500`（Ctrl+F5）。登入：
   - Admin：`Admin / admin`
   - Caregiver：`Ms.Testing / admin`

### 功能
- **照顧總覽**：顯示指標、建議介入、最近警報（管理員可編輯）。
- **住民名冊**：搜尋、快速篩選、CRUD 模態窗、在地化驗證、JSON 匯出。
- **營運**：床位與人力概況，管理員可透過模態窗更新，資料透過 DataGateway 保存。
- **家屬互動**：訊息清單與撰寫視窗，含分享連結複製/顯示。
- **偏好設定**：明暗主題、語系切換、Session 感知按鈕、可及性 Modal、aria-live 通知。

### 資料模式
- `dataMode: 'local'`：所有資料存於 `localStorage`。
- `dataMode: 'api'`：透過 `apiBase` 指定的 FastAPI 端點。
- `dataMode: 'hybrid'`：先顯示快取，再透過 DataGateway 同步。

### 自訂方式
| 領域 | 說明 |
|------|------|
| 字串 | 在 `i18n-resources.js` 補上字串（與 React 端共用的 i18next 資源）。 |
| 樣式 | 修改 `styles.css` Token；Modal/Toast 已集中。 |
| 資料層 | 在 `data-layer.js` 增加 namespace 或 API 呼叫。 |
| 匯出 | 編輯 `scripts.js` 中 Generate Report 的 JSON 結構。 |
