# 故障排查

## `No Python at '...\\python.exe'`
原因通常是舊機器留下來的虛擬環境路徑已失效。

處理方式：

```powershell
cd backend\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
```

## `ModuleNotFoundError` 或 `No module named 'pymongo'`
通常代表啟動 `uvicorn` 的 Python，和你安裝依賴時使用的 Python 不是同一個虛擬環境。

建議做法：

```powershell
cd backend\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

若仍有問題，重建 `venv` 再安裝依賴。

## Mongo 狀態檢查
檢查 Mongo 連線與資料：

- `GET /api/v1/mongo-upstream/status`
- `GET /api/v1/mongo-upstream/latest`

若 `connected=false`，請先確認：

- MongoDB 服務已啟動
- `.env` 或預設值中的 `MONGO_URI` 正確
- `MONGO_DB_NAME` 與你匯入資料時使用的資料庫一致

## MQTT / TCP 狀態檢查
可直接檢查：

- `GET /api/v1/data-reception/mqtt/status`
- `GET /api/v1/data-reception/tcp/status`

若裝置有送資料但看不到結果，先確認：

- MQTT broker / port 是否與設定一致
- 裝置送出的 JSON 結構是否合法
- Mongo 是否已連上且 collection 中有資料

## 前端連不到後端
請依序檢查：

- 後端是否已在 `localhost:8000` 啟動
- `frontend/src/constants/backend.ts` 是否仍是預設值
- 瀏覽器 console 與 Network 面板是否有 404 / CORS / 連線失敗

