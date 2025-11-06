# SmartCare Dashboard Adventure / 智慧照護小冒險

## English Version — Explain Like I’m in Fifth Grade
### What You Need
1. **Node.js LTS** (Download from [https://nodejs.org](https://nodejs.org) → click the green “LTS” button and install). This gives you Node + npm.
2. **Python 3** (already bundled on macOS/Linux; Windows users can grab it from the Microsoft Store). We only use it to serve the old dashboard quickly.
3. A terminal (Command Prompt, PowerShell, or macOS Terminal).

### Start the New React App
1. Open a terminal and run:
   ```bash
   cd frontend
   npm install
   npm run dev -- --host
   ```
2. When Vite says `Local: http://localhost:5173`, open that link in your browser.
3. Things to try:
   - Press **Simulate new data** to shuffle the numbers.
   - Click the language menu (Language / 語言 / 语言) and switch between English, 繁體中文, 简体中文.
   - Filter residents with the round buttons (All / High priority / Needs follow-up / Stable).

### Peek at the Legacy Dashboard
1. In a **second terminal** run:
   ```bash
   cd frontend/web-dashboard
   python -m http.server 5500
   ```
2. Visit `http://localhost:5500`.
3. Sign in with:
   - Admin: `Admin / admin`
   - Caregiver: `Ms.Testing / admin`
4. Explore the tabs, try dark mode, switch languages, and click **Generate Report** to download the JSON snapshot.

### If Something Looks Wrong
- Blank screen? Check the terminal that runs `npm run dev` for red errors. Most of the time re-running `npm install` fixes missing packages.
- Lots of red squiggles in VS Code? It usually means npm modules are missing. Run `npm install` inside `frontend/` and reload the window.
- Need to stop the servers? Press `Ctrl + C` in the terminal windows.

## 繁體中文（香港）版本 
### 需要準備
1. **Node.js LTS**（到 [https://nodejs.org](https://nodejs.org) 下載綠色的 LTS 版並安裝）。內含 Node 與 npm。
2. **Python 3**（macOS / Linux 已內建；Windows 可從 Microsoft Store 安裝）。我們只拿它來開啟舊儀表板。
3. 一個終端機（Command Prompt、PowerShell 或 macOS Terminal）。

### 啟動新的 React 儀表板
1. 打開終端機並輸入：
   ```bash
   cd frontend
   npm install
   npm run dev -- --host
   ```
2. 當 Vite 顯示 `Local: http://localhost:5173`，用瀏覽器開啟此網址。
3. 可以玩的功能：
   - 按 **模擬更新資料** 看數字與圖表隨機變化。
   - 點語言選單（Language / 語言 / 语言）切換英／繁／简。
   - 用圓形按鈕篩選住民（全部／高優先／需跟進／穩定）。

### 同時看看舊版儀表板
1. 在**另一個終端機視窗**輸入：
   ```bash
   cd frontend/web-dashboard
   python -m http.server 5500
   ```
2. 造訪 `http://localhost:5500`。
3. 登入帳密：
   - Admin：`Admin / admin`
   - Caregiver：`Ms.Testing / admin`
4. 逛逛各分頁、試試明暗主題、語言切換，按 **Generate Report** 可下載 JSON 報告。

### 發生問題怎麼辦？
- 頁面空白？檢查執行 `npm run dev` 的終端機是否出現紅字，重新跑一次 `npm install` 通常可修復。
- VS Code 出現一堆紅色波浪線？多半是 npm 套件還沒裝好，在 `frontend/` 內跑 `npm install` 後重開視窗。
- 想停止伺服器？在終端機中按 `Ctrl + C` 即可。
