# 小學生版本：讓 React 儀表板接上真正後端 🧒

這份小指南教你把 `frontend/` React 儀表板連到 **FastAPI 後端 + MySQL 資料庫**，並確認畫面上看到的住民資料真的是從資料表來的（不是前端亂編的）。

---

## 1. 後端準備好

1. 打開終端機，切到後端目錄（這個 repo 裡的 FastAPI 專案）：`cd backend/backend`
2. 建立並啟動虛擬環境：
   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # macOS/Linux: source .venv/bin/activate
   ```
3. 安裝套件：`pip install -r requirements.txt`（或依後端說明文件為主）
4. 確認 MySQL 有 `smart_elderly_care_system`（可用 `database/mysql/Dump20260426.sql` 匯入）
5. 啟動後端（命令依後端說明為主，這裡給一個例子）：
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
6. 健康檢查：瀏覽 `http://localhost:8000/health` 應回 `{"status":"ok",...}`

---

## 2. 告訴前端「後端住在哪裡」

1. 開 `frontend/src/constants/backend.ts`，確認：
   ```ts
   export const BACKEND_BASE_URL = 'http://localhost:8000';
   export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;
   ```
   後端網址或 port 不同就改這裡。
2. 住民資料來源：`/api/v1/residents`  
   - 這個 API 是在後端 `app/api/routes/residents.py` 寫好的，會去讀 `user` / `event` / `user_status` / `device` 等資料，組成一個「住民列表」回給前端。

---

## 3. 前端會怎麼取資料

- 住民（首頁 Residents 區塊）
  - `frontend/src/shared/resident-live-store.tsx` 會呼叫 `/api/v1/residents`，把回傳結果轉成前端的 `Resident` 型別。
  - `frontend/src/adapters/residents.ts` 負責做「欄位翻譯」，例如把後端的 `vitals.hr` / `heart_rate` 變成前端用的 `vitals.hr`。
  - `frontend/src/App.tsx` 會從這個 Store 拿資料來畫表格、KPI、Alerts、Insights。

- Admin 區塊
  - 所有 Admin 頁面都在 `frontend/src/components/admin/`。
  - 分頁切換由 `AdminSection.tsx` 控制，標籤文字會根據你上方選的語言自動切換（English / 繁體 / 簡體）。
  - 對應的 API：
    - UsersAdmin → `/api/v1/users`
    - DevicesAdmin → `/api/v1/devices`
    - LocationsAdmin → `/api/v1/locations`
    - EventsAdmin → `/api/v1/events` + `/api/v1/events/{id}/handle`
    - UserStatusAdmin → `/api/v1/user-status`
    - DeviceLogsAdmin → `/api/v1/device-data-log` + `/api/v1/data-reception/status`
    - ResidentsAdmin → `/api/v1/residents`（Admin 裡的 Resident Directory）
    - KpiAdmin → `/api/v1/kpi`

- Service Worker 模擬器
  - 以前的前端 SSE 模擬器（`sse-sw.js`）只在舊的 `web-dashboard/` 用。
  - 現在這個 React 前端的主路線是「接真正後端」，不再靠前端亂造住民資料。

---

## 4. 啟動前端

1. 另開終端機：`cd frontend`
2. 安裝套件（若第一次）：`npm install`
3. 啟動開發伺服器：`npm run dev -- --host`
4. 瀏覽器開 `http://localhost:5173`
   - 應該會看到住民名單（資料來自後端 `/api/v1/residents`）

---

## 5. 如何確認真的接到後端

1. 開瀏覽器 DevTools → Network：
   - 找 `GET /api/v1/residents`，URL 應該是 `http://localhost:8000/api/v1/residents`。
   - 回傳 JSON 應該有資料庫的住民。
2. 後端若新增 `event` 或 `user_status`、`device_data_log` 資料：
   - 稍等一下，或在介面上使用 Admin / Residents 的手動刷新
   - 就可以在住民狀態、生命徵象或 KPI 上看到變化（例如有跌倒事件就變成高風險）。

---

## 6. 常見問題

1. `/health` 打不開  
   - 檢查後端是否有跑、port 是否 8000（或你自己改的 port）
2. 取 `/api/v1/residents` 錯誤  
   - 檢查 MySQL 是否有 `smart_elderly_care_system`  
   - 檢查後端 DB 設定（帳號、密碼、host）是否正確  
   - 看後端 console 有沒有 SQL 錯誤訊息
3. Admin 功能錯誤  
   - 看 DevTools Network 的錯誤訊息，確認 `/api/v1/*` 有沒有 404/500  
   - 確認 FastAPI 有啟用對應路由（例如 `/api/v1/user-status`）  
   - 檢查 `frontend/src/services/api.ts` 路徑是否拼寫正確
4. 語言切換沒反應  
   - 確認 `frontend/src/i18n.ts` 有載入 `en` / `zh-HK` / `zh-CN`  
   - 刪除瀏覽器 localStorage 裡的 `i18nextLng` 再重新整理。
5. CORS 問題  
   - 若看到 CORS 錯誤，請在 FastAPI 的 CORS 設定裡加入 `http://localhost:5173`。

---

## 7. 如果只想做前端 Demo？

這個 React 前端是專門用來「接真正後端」的。如果你暫時還沒有後端／資料庫，可以先：

1. 跑舊版的純前端儀表板：`frontend/web-dashboard/`（有自己的 SSE 模擬器與 README）
2. 等後端準備好，再回到 `frontend/` 目錄照這份小學生指南接上 `/api/v1/*`

這樣就可以先 Demo UI，再慢慢補上真正的資料來源。***
