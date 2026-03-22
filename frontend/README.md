# Frontend

`frontend/` 是這個專案唯一正式維護的前端。

- 技術棧：Vite + React + TypeScript
- 預設後端：`http://localhost:8000`
- API 前綴：`/api/v1`

啟動方式保持不變：

```powershell
cd frontend
npm install
npm run dev -- --host
```

補充：

- 先前的 `frontend/web-dashboard` 已歸檔，不再作為活躍 repo 的一部分
- `src/constants/backend.ts` 仍使用 `http://localhost:8000` 作為預設值，避免改變工程師原有體驗
- release 包會包含後端可直接服務的已建置 static；repo 本身不維護打包輸出

後端對接與完整啟動流程見 `docs/setup.md`。

