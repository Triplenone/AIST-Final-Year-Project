# SmartCare Dashboard Adventure / 智慧照護小冒險

## English Version
### What Is This?
Think of the dashboard as a digital noticeboard for a care home. It shows how residents feel, lets helpers add notes, and reminds families to say hi. Everything runs in your browser, so you can explore even without internet.

### How Do I Use It?
1. Open a terminal, run `python -m http.server 5500` inside `frontend/web-dashboard`.
2. Visit `http://localhost:5500` (Ctrl+F5).
3. Sign in:
   - Admin: `Admin / admin`
   - Caregiver: `Ms.Testing / admin`
4. Explore tabs: Overview, Residents, Operations, Family.
5. Try Light/Dark, language switch, “Generate Report” (downloads JSON).

### Behind the Scenes
- The page saves data in `localStorage`, so refreshes keep your changes.
- Switching `APP_CONFIG.dataMode` to `api` or `hybrid` makes the dashboard talk to FastAPI via DataGateway, preparing for real data.
- Modals trap focus and a hidden announcer reads toast messages for screen readers.

### Exploration Tips
- Add a resident with a fun name and watch the overview counter update instantly.
- Switch languages (EN/繁/简) and notice buttons/placeholders/toasts change.
- Click “Share access link” in Family; it copies the URL or prints it if copying isn’t allowed.

### Ready for the Future
When backend, MQTT, and OTA arrive, flip `APP_CONFIG.apiBase` to the live server and choose `hybrid` or `api`. The same UI controls real residents without rewrites.

## 繁體中文（香港）版本
### 這是甚麼？
把儀表板想成照護中心的大告示牌：顯示住民狀況、讓照顧員寫備註，也提醒家人打招呼。全部在瀏覽器內運作，就算沒有網路也能練習。

### 怎樣使用？
1. 打開終端機，在 `frontend/web-dashboard` 執行 `python -m http.server 5500`。
2. 前往 `http://localhost:5500`（Ctrl+F5）。
3. 登入：
   - Admin：`Admin / admin`
   - Caregiver：`Ms.Testing / admin`
4. 逛四個分頁：總覽、住民、營運、家屬。
5. 玩玩明暗主題、語言切換、以及「Generate Report」（會下載 JSON）。

### 背後運作
- 網頁把資料寫在 `localStorage`，重新整理也不會消失。
- 將 `APP_CONFIG.dataMode` 換成 `api` 或 `hybrid`，儀表板會透過 DataGateway 與 FastAPI 對話，未來接真資料也不用重寫。
- 每個彈窗都鎖住焦點，還有隱藏播報員把提示讀給螢幕閱讀器聽。

### 探索提示
- 新增一個有趣的住民名字，看看清單和總覽計數立即更新。
- 切換語言（英/繁/简），觀察按鈕、提示、通知如何跟著改。
- 在家屬分頁按「Share access link」，它會複製連結；若無法複製就直接顯示給你。

### 為未來做準備
等後端、MQTT、OTA 上線後，把 `APP_CONFIG.apiBase` 指向正式伺服器，再選 `hybrid` 或 `api` 模式，現有 UI 就能控制真實住民。
