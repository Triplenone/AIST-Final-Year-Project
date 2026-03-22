# 啟動與開發流程

## 後端
後端正式路徑是 `backend/backend`，啟動方式保持與原交付一致：

```powershell
cd backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

補充：

- 若已經有 `venv`，可以省略重建步驟
- 也可以直接使用 `backend/backend/run_backend.ps1`
- `backend/backend/.env.example` 只是樣板；若你不建立 `.env`，程式仍會用目前預設值啟動

後端啟動後可檢查：

- `http://localhost:8000/docs`
- `http://localhost:8000/api/v1/mongo-upstream/status`
- `http://localhost:8000/api/v1/data-reception/mqtt/status`
- `http://localhost:8000/api/v1/data-reception/tcp/status`

## 前端
前端正式路徑是 `frontend`：

```powershell
cd frontend
npm install
npm run dev -- --host
```

預設開發位址：

- `http://localhost:5173`

目前前端仍預設連到：

- `http://localhost:8000`

如果你要改後端位址，請調整 `frontend/src/constants/backend.ts`，但預設值已刻意維持現有習慣。

## 目錄約定
- `backend/backend`：正式 FastAPI runtime
- `frontend`：正式 React/Vite UI
- `database/mysql`：MySQL dump
- `database/mongo`：Mongo JSON 與樣例資料
- `docs`：單一文件入口

