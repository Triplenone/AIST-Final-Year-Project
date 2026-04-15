# Release 組裝與內容

## 組裝腳本
使用：

```powershell
.\scripts\build_release.ps1
```

預設輸出：

- `release/AIST-FYP-delivery/`
- `release/AIST-FYP-delivery.zip`

## release 內容
release 包固定包含：

- 乾淨專案快照
- `database/mysql`
- `database/mongo`
- 已建置的 `backend/backend/static`
- `backend/backend/run_backend.ps1`
- 一份中文 `Quickstart.md`

## release 明確排除
- `.git`
- `.env`
- `venv` / `.venv`
- `node_modules`
- zip / installer / exe
- 舊前端 archive
- 測試錄影、trace、快取

## 設計原則
- source repo 只保留實際維護內容
- release 包保留工程師熟悉的啟動體驗
- 原始手動命令仍是第一等公民；腳本只提供便利，不取代原命令
