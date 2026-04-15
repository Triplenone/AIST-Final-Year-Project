# SmartCare Dashboard Adventure / 智慧照護小冒險（更新版）

## English Version — Explain Like I’m in Fifth Grade
### What You Need
1. **Node.js LTS** (install from [https://nodejs.org](https://nodejs.org) → green “LTS”).
2. **Python 3** (built-in on macOS/Linux; Windows: Microsoft Store) if you want to run legacy demos; main backend is FastAPI.
3. A terminal (Command Prompt, PowerShell, or macOS Terminal).

### Start the React App (now using the real backend)
1. Open a terminal:
   ```bash
   cd frontend
   npm install
   npm run dev -- --host
   ```
2. Open the link shown by Vite (usually `http://localhost:5173`).
3. The app now fetches residents from `http://localhost:8000/api/v1/residents` (polling every 10s). Simulator service worker is no longer auto-registered.

### Admin & Dashboard
- Dashboard: KPIs, alerts, insights, resident list still keep the same look.
- Admin section: manages Users / Devices / Locations / Events / Device Logs / User Status / Residents / KPI via `/api/v1/*`.

### If Something Looks Wrong
- Blank screen? Check the terminal running `npm run dev` for red errors; re-run `npm install` if packages are missing.
- No data? Ensure the FastAPI backend is running on `http://localhost:8000` and MySQL has `smart_elderly_care_system`.
- Stop servers: press `Ctrl + C` in the terminal.

## 繁體中文（香港）版本
### 需要準備
1. **Node.js LTS**（到 [https://nodejs.org](https://nodejs.org) 安裝綠色 LTS 版）。
2. **Python 3**（macOS / Linux 內建；Windows 可從 Microsoft Store 安裝）若要跑舊 demo；主要後端是 FastAPI。
3. 一個終端機（Command Prompt、PowerShell 或 macOS Terminal）。

### 啟動新的 React 儀表板（改用真實後端）
1. 打開終端機：
   ```bash
   cd frontend
   npm install
   npm run dev -- --host
   ```
2. 打開 Vite 提供的網址（通常 `http://localhost:5173`）。
3. 現在會從 `http://localhost:8000/api/v1/residents` 取住民（每 10 秒輪詢），不再自動註冊模擬器的 service worker。

### Admin 與儀表板
- 儀表板：維持原本 KPI／警報／住民卡片的設計。
- Admin 區：透過 `/api/v1/*` 管理用戶、設備、位置、事件、設備日誌、用戶狀態、住民、KPI。

### 發生問題怎麼辦？
- 頁面空白：查看執行 `npm run dev` 的終端機是否有紅字，缺套件就 `npm install`。
- 沒資料：確認 FastAPI 後端已啟動且 MySQL 有 `smart_elderly_care_system`。
- 停止伺服器：終端機按 `Ctrl + C`。
