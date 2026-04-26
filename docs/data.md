# 數據檔案

## 位置

- MySQL dump：`database/mysql/`
- Mongo JSON：`database/mongo/`

## MySQL dumps

- `database/mysql/Dump20251120.sql` — 早期 seed，保留作歷史版本。
- `database/mysql/Dump20260316.sql` — 中期 seed，保留作歷史版本。
- `database/mysql/Dump20260426.sql` — current default seed，包含 HK 居民測試 user 及 device binding。

## MySQL 匯入

預設 full-demo setup 使用 `Dump20260426.sql`：

```powershell
mysql -u root -p smart_elderly_care_system < database\mysql\Dump20260426.sql
```

如要保留較早版本，可改匯入 `Dump20260316.sql` 或 `Dump20251120.sql`。

## MongoDB JSON

Mongo JSON 放在 `database/mongo/`：

- `database/mongo/smart_elderly_mongo.device_raw_upstream.json`
- `database/mongo/sample_upstream_for_mongo.json`

匯入前請確認 backend `.env` 與 `backend/backend/app/config.py` 使用相同 MongoDB database name。預設值：

- `MONGO_URI=mongodb://localhost:27017`
- `MONGO_DB_NAME=smart_elderly_mongo`

可用 `mongoimport` 匯入對應 collection；如 collection 名稱不確定，先按 demo 或測試需要確認再匯入。
