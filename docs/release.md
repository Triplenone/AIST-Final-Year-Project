# Release 打包

## 打包指令

在 repo root 執行：

```powershell
.\scripts\build_release.ps1
```

成功後會產生：

- `release/AIST-FYP-delivery/`
- `release/AIST-FYP-delivery.zip`

## Release 內容

`scripts/build_release.ps1` 會先 build frontend，再複製一份乾淨 project snapshot 到 `release/AIST-FYP-delivery/project/`。

主要包含：

- `frontend/`
- `backend/backend/`
- `database/mysql/`
- `database/mongo/`
- build 後的 frontend static assets，注入到 `project/backend/backend/static/`
- `backend/backend/run_backend.ps1`
- release 根目錄的 `Quickstart.md`

## 排除內容

打包流程會排除：

- `.git`
- `.env`
- `venv` / `.venv`
- `node_modules`
- `dist`
- zip / installer / exe / webm
- 既有 `release/` 輸出

## 注意事項

- MySQL current default seed 是 `database/mysql/Dump20260426.sql`。
- Mongo JSON 放在 `database/mongo/`。
- `Quickstart.md` 由 `scripts/release/quickstart.template.md` 複製而來。
- 如果 release script 或 quickstart template 有改動，請同步更新本文。
