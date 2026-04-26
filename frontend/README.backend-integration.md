# Frontend ↔ Backend Integration (React + Vite + FastAPI)

本文件說明 **`frontend/` React/Vite 前端** 如何對接 **FastAPI 後端**，並與目前的資料表（`smart_elderly_care_system`）與 Admin 模組保持一致。

> 如果想要「一步一步」跟著做，請搭配 `frontend/guide.md` 一起看。

---

## 1. Architecture Overview / 架構概覽

- **Backend**
  - 位置：`backend/backend/app`
  - REST 前綴：`/api/v1`
  - 預設：`http://localhost:8000`
  - 資料庫：MySQL `smart_elderly_care_system`（可從 `database/mysql/Dump20260426.sql` 匯入）
- **Frontend**
  - 位置：`frontend/`
  - 技術：React 18 + Vite + TypeScript + i18next（三語系）
  - 顯示內容：Residents 概況、KPI、Alerts/Insights、Admin 管理模組
- **資料流**
  - 前端透過 `src/services/api.ts` 呼叫 `/api/v1/*`
  - `/api/v1/residents` 由後端聚合 `user`／`event`／`user_status`／`device` 等表，回傳 Resident 列表（含生命徵象與裝置狀態）
  - 前端將該列表映射為 internal `Resident` 型別，提供首頁 Residents 區與 KPI 使用

---

## 2. Configuration / 設定

### 2.1 Backend URL

`src/constants/backend.ts`：

```ts
export const BACKEND_BASE_URL = 'http://localhost:8000';
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;
```

- 若後端部署在其他主機或 port，請只改 `BACKEND_BASE_URL`。
- 也可在 `vite.config.ts` 透過 `import.meta.env` 注入，避免硬編碼在 repo 中。

### 2.2 Axios client

`src/services/api.ts`：

- 建立共用 `api` 實例，`baseURL = API_BASE_URL`
- 統一錯誤處理（把 `response.data.detail` 或 `error.message` 包成 `Error` 丟回去）
- 封裝的 API：
  - `userApi` → `/users/`
  - `deviceApi` → `/devices/`
  - `locationApi` → `/locations/`
  - `eventApi` → `/events/` + `/events/{id}/handle`
  - `userStatusApi` → `/user-status/`
  - `deviceDataLogApi` → `/device-data-log/` + `/device-data-log/search-elder-detail` + `/device-data-log/statistics/overview`
  - `residentApi` → `/residents/` + `/residents/{id}` + `/residents/{id}/device-data-logs`
  - `dataReceptionApi` → `/data-reception/receive` + `/data-reception/status`
  - `kpiApi` → `/kpi/`

---

## 3. Data Model Alignment / 資料模型對齊

### 3.1 Backend types

`src/types/backend.ts` 對齊後端 Pydantic/SQLAlchemy 模型，包含：

- `BackendUser`（對應 `user` 表）
- `BackendDevice`（對應 `device` 表，含 `current_status`、`battery_level`、`deploy_location`）
- `BackendLocation`（對應 `location_zone` 表）
- `BackendEvent`（對應 `event` 表）
- `BackendUserStatus`（對應 `user_status` 表，含 `heart_rate`、`blood_oxygen`、`body_temperature` 等）
- `BackendDeviceDataLog`（對應 `device_data_log` 表）
- `BackendResident`（對應 `/api/v1/residents` 聚合輸出）
- `BackendKpiMetric`（對應 `kpi_metrics` 表）

### 3.2 Resident mapping / 住民映射

`src/adapters/residents.ts`：

- 將 `BackendResident` → 前端 `Resident` 型別（定義在 `src/sse/client.ts`）
- 主要欄位：
  - `id`, `name`, `room`, `status` (`'stable' | 'followUp' | 'high' | 'checked_out'`)
  - `lastSeenAt`, `lastSeenLocation`
  - `vitals.hr`, `vitals.bpSystolic`, `vitals.bpDiastolic`, `vitals.spo2`, `vitals.temperature`
  - `checkedOut`, `createdAt`, `updatedAt`
  - `origin: 'db'` 代表來自後端資料庫
- 若後端 `vitals` 欄位缺值，會改用 `heart_rate` / `blood_oxygen` / `body_temperature` 等聚合欄位補上。

---

## 4. Resident Data Flow / 住民資料流

### 4.1 Snapshot hook

`src/hooks/useBackendResidentSnapshot.ts`：

- 呼叫 `residentApi.list()` 取得 `BackendResident[]`
- 透過 `mapBackendResidents` 轉成 `Resident[]`
- 回傳 `{ residents, refresh }`，供其他元件/Store 使用

### 4.2 Global resident store

`src/shared/resident-live-store.tsx`：

- 目前行為：
  - 初次載入時呼叫 `useBackendResidentSnapshot()` 把 `/api/v1/residents` 的回應灌入全域 Store
  - 提供 `refreshResidents()` 讓 UI 可以手動更新資料
  - 暴露 `residents`（`Record<string, Resident>`）、`updateResident`、`removeResident`、`addResident` 等方法
- 未來可在這裡加入真正的後端 SSE 連線（目前為輪詢模式）。

### 4.3 Frontend usage

- `src/App.tsx`：
  - 從 `useResidentLiveStore()` 取得 `residents`，並用 `deriveResidentMetrics` / `deriveAlertsFromResidents` / `deriveInsightsFromResidents` 產生 KPI 與清單。
  - Residents 表格 (`#residents` section) 直接使用這份資料（支援狀態篩選與多語系顯示）。
- `src/components/admin/ResidentsAdmin.tsx`：
  - 在 Admin 區塊中提供「Resident Directory」，直接從 `residentApi.list()` 取得 `BackendResident[]`。
  - 顯示 ID / 姓名 / 房號 / 狀態 / 最後出現 / 生命徵象摘要 / 裝置資訊，並支援搜尋與狀態篩選。

---

## 5. Admin Modules / 管理模組

所有 Admin 元件位於 `src/components/admin/`，由 `AdminSection` 統一切換分頁，並使用 i18n (`admin.tabs.*`) 顯示標籤：

- `UsersAdmin` → `/api/v1/users`
- `DevicesAdmin` → `/api/v1/devices`
- `LocationsAdmin` → `/api/v1/locations`
- `EventsAdmin` → `/api/v1/events`（含 handle API，更新 `event_status` 等欄位）
- `UserStatusAdmin` → `/api/v1/user-status`
- `DeviceLogsAdmin` → `/api/v1/device-data-log` + `/api/v1/data-reception/status`
- `ResidentsAdmin` → `/api/v1/residents`（Resident Directory）
- `KpiAdmin` → `/api/v1/kpi`

Admin 區塊使用的文字（標題、欄位名、錯誤訊息、按鈕）都集中在 `src/locales/**/translation.json` 的 `admin.*` 區塊。

---

## 6. Step‑by‑Step: Dev setup / 開發環境步驟

1. **後端**
   - 建議依照後端目錄下的說明啟動（例如 `cd backend/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`）。
   - 確認 MySQL 已匯入 `database/mysql/Dump20260426.sql`，並可正常連線。
2. **前端**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host
   ```
3. **驗證整合**
   - 打開瀏覽器 DevTools → Network：
     - 應看到 `GET /api/v1/residents`、`GET /api/v1/users` 等呼叫。
   - 檢查：
     - 首頁 Residents 表是否顯示 DB 中的住民資料。
     - Admin 各分頁是否能正常讀取（必要時再實作/啟用新增/編輯/刪除）。

---

## 7. Files to check when backend changes / 後端變更時應同步的檔案

若未來調整後端 schema 或 API 路徑，請同步檢查：

- `src/constants/backend.ts`（後端 base URL / API prefix）
- `src/types/backend.ts`（是否需要新增/修改欄位）
- `src/services/api.ts`（路徑是否改動，例如 `/residents/` → `/elders/`）
- `src/adapters/residents.ts`（聚合欄位名稱是否有調整）
- `src/components/admin/*`（表格欄位、表頭、CRUD 行為是否仍與後端對得上）
- `src/locales/**/translation.json`（若欄位命名或狀態文案變更）

---

## 8. Notes / 備註

- 目前住民資料以輪詢/快照方式更新；若後端未來提供 SSE 或 WebSocket，可在 `resident-live-store` 中改掛線上事件流。
- 若部署到不同環境（測試機/正式機），建議改用環境變數或 CI 注入 `BACKEND_BASE_URL`，不要把正式機網址直接寫在 repo 裡。

這份文件搭配 `frontend/README.md`（整體介紹）與 `frontend/guide.md`（小學生版教學）一起閱讀，會更容易理解整條前後端整合路線。***
