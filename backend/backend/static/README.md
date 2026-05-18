# Generated Static Output

- 開發：在 `frontend/` 執行 `npm run dev`（API 仍指向同 host 的 `:8000`）
- 單端口 / Cloudflare Tunnel：在 repo 根目錄執行  
  `cd frontend && npm run build:static`  
  然後只啟動 `uvicorn`（8000）+ `cloudflared tunnel --url http://127.0.0.1:8000`，用 Tunnel URL 打開瀏覽器
- 正式交付包：使用 `scripts/build_release.ps1`

