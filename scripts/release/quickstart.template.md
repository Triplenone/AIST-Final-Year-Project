# 快速开始

## 后端启动
```powershell
cd project\backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 前端启动
```powershell
cd project\frontend
npm install
npm run dev -- --host
```

## 数据位置
- MySQL：`project\database\mysql`
- MongoDB：`project\database\mongo`

## 说明
- release 包已经包含 `backend/backend/static` 的已建置前端资源。
- 只启动后端也可以先预览交付包内的前端页面。
- 更完整的安装、导入与排错说明见 `project\docs\`。
