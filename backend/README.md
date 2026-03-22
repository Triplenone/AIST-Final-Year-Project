# Backend Runtime

這個專案的正式後端在 `backend/backend`。

目前保留的操作方式如下：

```powershell
cd backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

說明：

- `backend/requirements.txt` 仍是唯一依賴來源
- `backend/backend/.env.example` 反映當前預設配置
- `backend/backend/static/` 在源碼 repo 中是 generated artifact 目錄；release 包才會放入已建置前端

詳細操作請看 `docs/setup.md`、`docs/data.md`、`docs/troubleshooting.md`。

