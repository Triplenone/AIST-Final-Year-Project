# 資料資產與匯入

## 位置
- MySQL dump：`database/mysql/`
- Mongo JSON：`database/mongo/`

目前已整理的主要檔案：

- `database/mysql/Dump20251120.sql`
- `database/mysql/Dump20260316.sql`
- `database/mongo/smart_elderly_mongo.device_raw_upstream.json`
- `database/mongo/sample_upstream_for_mongo.json`

## MySQL 匯入
建立資料庫後可直接匯入：

```powershell
mysql -u root -p smart_elderly_care_system < database\mysql\Dump20260316.sql
```

如果你要保留較早版本，也可以改匯入 `Dump20251120.sql`。

## MongoDB 匯入
Mongo JSON 已整理到 `database/mongo/`。若你使用 `mongoimport`，請依實際工具版本調整參數；常見流程是指定資料庫 `smart_elderly_mongo` 與目標 collection。

專案預設值：

- `MONGO_URI=mongodb://localhost:27017`
- `MONGO_DB_NAME=smart_elderly_mongo`

## 設定對應
資料庫預設值來自 `backend/backend/app/config.py` 與 `backend/backend/.env.example`。

若你要修改 MySQL 或 Mongo 位置，優先透過 `.env` 覆蓋，不要直接改動程式碼。

