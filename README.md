# AIST Final Year Project

## 這是什麼
這份 repo 現在只保留實際維護中的源碼、資料資產、文件與必要腳本。

- 正式後端：`backend/backend`
- 正式前端：`frontend`
- 資料資產：`database/mysql`、`database/mongo`
- 主要文件：`docs/`
- release 組裝腳本：`scripts/build_release.ps1`

舊版前端、placeholder scaffold、本機虛擬環境、壓縮包與零散說明已移出活躍 repo，相關去向見 `docs/archive.md`。

## 後端怎麼啟動
後端啟動方式保持不變：

```powershell
cd backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

說明：

- 啟動工作目錄仍是 `backend/backend`
- 依賴來源仍是 `backend/requirements.txt`
- `.env` 不是必填；若你要覆蓋預設值，請從 `backend/backend/.env.example` 複製

更多細節見 `docs/setup.md` 與 `docs/troubleshooting.md`。

## 前端怎麼啟動
前端主體是 `frontend/`，預設仍連到 `http://localhost:8000`。

```powershell
cd frontend
npm install
npm run dev -- --host
```

開發服務啟動後，預設位址是 `http://localhost:5173`。

## 資料怎麼匯入
資料資產已集中到：

- MySQL：`database/mysql/`
- MongoDB：`database/mongo/`

匯入方式與常見指令見 `docs/data.md`。

## 主要文件
- `docs/setup.md`：啟動與開發流程
- `docs/data.md`：SQL / JSON 位置與匯入方式
- `docs/troubleshooting.md`：常見啟動、Mongo、MQTT、TCP 問題
- `docs/release.md`：release 包內容與組裝方式
- `docs/archive.md`：舊資料夾與舊文件的歸檔去向

