# Codex 任務：Slice D — vitals_event_bridge endpoint

## Boot order

1. 讀 `_ben_mem/PROTO.md`（memory 寫入格式）
2. 讀 `_ben_mem/CURR.mem`（當前事實快照）
3. 讀本文件
4. 讀目標檔案

---

## Objective

在 backend 新增 `GET /api/v1/mongo-upstream/vitals/user/{user_id}/history` endpoint，橋接 MySQL user → device → MongoDB vitals history，讓前端已有嘅 `useVitalsHistory` hook 從 graceful fallback 升級為真實數據顯示。

同時擴展 `Device.mac_address` 從 `String(20)` 到 `String(32)`，消除 22 字符外部設備 ID 嘅存儲限制。

**Slice C（MQTT raw ingest）代碼已完成，本任務不涉及 Slice C。**

---

## Target branch

`ben/merge-backend-slices-rescue`

---

## Target files（只改呢幾個）

| File | Action |
|------|--------|
| `backend/backend/app/models/device.py` | 改 `mac_address` column 長度 |
| `backend/backend/app/api/routes/mongo_upstream.py` | 新增 1 個 endpoint |

共 2 個檔案，預計 ~50 行新代碼。

---

## Protected surfaces（絕對唔好動）

- `frontend/` — 所有前端檔案
- `backend/backend/app/api/routes/` 內除 `mongo_upstream.py` 外嘅所有 route 檔案
- `backend/backend/app/services/` — 所有 service 檔案
- `backend/backend/app/models/` 內除 `device.py` 外嘅所有 model 檔案
- `backend/backend/app/config.py`
- `backend/backend/app/database.py`
- `backend/backend/app/main.py`
- `frontend/src/pages/FlyCarePage.tsx`
- `frontend/src/adapters/position-command-center.ts`

---

## Forbidden changes

- 唔好改任何前端代碼
- 唔好改 config.py 或 database.py
- 唔好改現有嘅 endpoint 簽名或返回格式
- 唔好加新嘅 pip dependency
- 唔好改 main.py 嘅 lifespan hooks

---

## 改動 1：Device model — 擴展 mac_address

**File**: `backend/backend/app/models/device.py`  
**Line 69**:

```python
# 改前
mac_address = Column(String(20), nullable=True, unique=True)

# 改後
mac_address = Column(String(32), nullable=True, unique=True)
```

原因：外部設備 ID（如 `ESP32_00005CFA7AD4DB1C`）有 22 字符，`String(20)` 放唔落。

---

## 改動 2：新增 endpoint — user_id 查 vitals history

**File**: `backend/backend/app/api/routes/mongo_upstream.py`

### 新增 imports（檔案頂部）

```python
from fastapi import APIRouter, Depends, HTTPException, Query   # 加 Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
```

### 新增 endpoint（插入位置：在 `get_vitals_history` 之後、`get_latest_flight` 之前）

⚠️ 路由順序關鍵：必須放在 `/{doc_id}` catch-all 之前，否則 FastAPI 會將 `"vitals"` 當成 doc_id。

```python
@router.get("/vitals/user/{user_id}/history", response_model=Dict[str, Any])
async def get_vitals_history_for_user(
    user_id: int,
    start_ts: Optional[int] = Query(None, description="Start timestamp (inclusive)"),
    end_ts: Optional[int] = Query(None, description="End timestamp (inclusive)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    db: Session = Depends(get_db),
):
    """Bridge user_id -> device -> MongoDB vitals history.

    Looks up the user's device(s) in MySQL, then queries MongoDB
    for vitals/status_update documents matching those device IDs.
    """
    # 1. Find device(s) bound to this user
    devices = db.query(Device).filter(Device.elderly_user_id == user_id).all()
    if not devices:
        raise HTTPException(
            status_code=404,
            detail=f"No device bound to user_id={user_id}",
        )

    # 2. Build candidate device_id values for MongoDB query.
    #    MongoDB stores device_id as string (see _build_doc in mongo_raw_upstream.py).
    #    - If DEVICE_ID_MAP mapped external->integer, MongoDB has str(integer).
    #    - If no mapping, MongoDB has the raw external string.
    candidate_ids: list[str] = []
    reverse_map = {v: k for k, v in settings.device_id_map.items()}

    for dev in devices:
        # Primary: str(device_id) — matches DEVICE_ID_MAP mapped writes
        candidate_ids.append(str(dev.device_id))
        # Fallback 1: mac_address — matches direct external ID writes
        if dev.mac_address:
            candidate_ids.append(dev.mac_address)
        # Fallback 2: reverse DEVICE_ID_MAP lookup
        ext = reverse_map.get(dev.device_id)
        if ext:
            candidate_ids.append(ext)

    # Deduplicate
    candidate_ids = list(dict.fromkeys(candidate_ids))

    # 3. Query MongoDB
    query: Dict[str, Any] = {
        "device_id": {"$in": candidate_ids} if len(candidate_ids) > 1 else candidate_ids[0],
        "data_type": {"$in": ["vitals", "status_update"]},
    }
    if start_ts is not None or end_ts is not None:
        query["timestamp"] = {}
        if start_ts is not None:
            query["timestamp"]["$gte"] = start_ts
        if end_ts is not None:
            query["timestamp"]["$lte"] = end_ts

    try:
        coll = _get_collection()
        skip = (page - 1) * page_size
        cursor = (
            coll.find(query)
            .sort("server_received_at", -1)
            .skip(skip)
            .limit(page_size)
        )
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            item = _to_vitals_item(doc)
            item["user_id"] = user_id
            items.append(item)
        total = await coll.count_documents(query)
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    return {"page": page, "page_size": page_size, "total": total, "items": items}
```

### 前端期望嘅 response 格式（參考，唔使改前端）

```json
{
  "page": 1,
  "page_size": 50,
  "total": 3,
  "items": [
    {
      "_id": "663f...",
      "user_id": 5,
      "device_id": "1",
      "timestamp": 1715000000,
      "server_received_at": "2026-04-16T10:00:00Z",
      "data_type": "status_update",
      "vitals": {
        "heart_rate": 72,
        "spo2": 98,
        "body_temperature": 36.5,
        "resp_rate": 16,
        "hrv": null
      },
      "raw_payload": { ... }
    }
  ]
}
```

前端 `useVitalsHistory` hook 會從 `vitals`、`sensors`、`payload` 多層 fallback 提取 heart_rate / spo2 / temperature，所以只要 `_to_vitals_item()` 嘅輸出有 `vitals` field 就得。

---

## Acceptance criteria

1. `GET /api/v1/mongo-upstream/vitals/user/{user_id}/history` 返回正確 JSON：
   - 有綁 device 嘅 user → `{page, page_size, total, items}`
   - 冇綁 device 嘅 user → HTTP 404
   - MongoDB 唔可用 → HTTP 503
2. `Device.mac_address` 列長度為 `String(32)`
3. 現有 endpoint 行為完全不變
4. 冇新 pip dependency
5. 前端零改動（`git diff -- frontend/` 為空）

---

## Validation commands

```bash
# 1. Python syntax check
cd backend/backend && python -c "from app.models.device import Device; from app.api.routes.mongo_upstream import router; print('imports ok')"

# 2. 確認冇改前端
git diff -- frontend/

# 3. 確認只改咗 2 個後端檔案
git diff --name-only

# 4. 確認 protected surfaces 未被動
git diff -- backend/backend/app/config.py
git diff -- backend/backend/app/database.py
git diff -- backend/backend/app/main.py
git diff -- backend/backend/app/services/

# 5. 確認 mac_address 長度
grep -n "mac_address" backend/backend/app/models/device.py
```

---

## _ben_mem update

完成後更新 `_ben_mem/CURR.mem`：

```
V.merge.sliceC=complete-in-code,needs-deploy-config
V.merge.sliceD=complete
V.merge.sliceD.endpoint=GET /api/v1/mongo-upstream/vitals/user/{id}/history
V.merge.sliceD.mac_address_length=String(32)
V.merge.sliceD.bridge_logic=user_id->Device.elderly_user_id->candidate_device_ids->MongoDB
```

同時新增 `_ben_mem/LOG/YYYYMMDD-HHMMSS.mem` 記錄變更。

---

## Final report format

```
Branch: ...
Files changed: ...
Validations: ...
Blockers: ...
Docs updated: ...
Mem updated: ...
SVG→PNG fallback: none
Commits: ...
```

---

## Decision log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 用 `$in` 查多個 candidate device_id | MongoDB 嘅 device_id 可能係 str(integer) 或 raw external string，取決於有冇用 DEVICE_ID_MAP |
| 2 | 每個 item 加 `user_id` field | 前端 `MongoVitalsHistoryItem` type 有 `user_id` field |
| 3 | 404 when no device | 前端 hook 已處理 404 → `isUnavailable` fallback |
| 4 | 複用 `_to_vitals_item()` | 保持同 `/vitals/history` 一致嘅 response shape |
| 5 | mac_address 擴到 32 唔係 22 | 留 buffer 俾未來更長嘅 ID 格式 |
| 6 | 新 route 放在 `/{doc_id}` 之前 | FastAPI 路由匹配順序：具體路徑優先於 path parameter |
