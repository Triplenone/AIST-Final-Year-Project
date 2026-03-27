# Position Command Center Backend-Facing Boundary

## 1. Purpose

这份文档定义 Position frontend rebuild 的 backend boundary。

读者：
- backend engineer
- frontend maintainer
- API reviewer
- future Codex

目标：
- 明确 frontend 当前依赖哪些 API
- 明确哪些 derivation 仍在 frontend
- 明确哪些 backend 改动不是当前 Phase 3 的工作

---

## 2. Current Frontend Inputs

Position 目前只使用现有 frontend API layer。

### 2.1 Latest resident state
- `mongoUpstreamApi.getLatest({ device_id, data_type: 'status_update' })`

当前用途：
- latest upstream snapshot
- current health state
- zone derivation source
- selected resident summary

### 2.2 Selected resident recent activity
- `mongoUpstreamApi.list({ device_id, data_type: 'status_update', page, page_size })`

当前用途：
- selected-resident recent activity
- activity blocked state
- zone/vitals transition hints

---

## 3. What Frontend Derives Locally

Frontend 继续负责：
- timestamp normalization
- truth classification
- freshness classification
- risk classification
- priority ordering
- zone command derivation
- recent activity synthesis
- surface-state derivation

Backend 仍然只是 raw data provider。

---

## 4. What Frontend Must Not Change

Position frontend 不得修改：
- backend route path
- backend response payload shape
- backend validation logic
- Mongo upstream route behavior
- MySQL schema
- event creation flow
- FastAPI app structure

这些都不是当前 Position production-hardening 的工作。

---

## 5. Payload Reality

Current payload reality:
- `server_received_at` 可能是 ISO string
- seed Mongo data 里的 `server_received_at` 也可能是 `{ "$date": "..." }`
- `location`, `fall_detection`, `sos`, `sensors`, `system` 可能出现在 top-level
- 也可能在 `payload.*`

Rule:
- frontend 必须继续使用 defensive parsing
- component layer 不允许直接复制 raw payload parsing

---

## 6. Why SQL Event/DataLog APIs Stay Out

Repo 里有：
- `eventApi.list`
- `deviceDataLogApi.list`
- `deviceDataLogApi.searchElderDetail`

Phase 3 继续不把它们接入 Position command logic。

原因：
- 当前 resident registry 仍然是 frontend-owned
- repo 里没有 authoritative resident-device-event normalized mapping
- 现在不能在 JSX 或 component layer 做 fuzzy join

Rule:
- Position frontend 不做 ad hoc resident/device/event matching
- backend 若未来提供 authoritative mapping，再开新 workstream

---

## 7. Backend Runtime Blocker

当前 live backend validation 仍然 blocked：
- `backend/backend/.env` 含 extra keys
- 当前 `Settings` validation 会阻塞 app boot

这个 blocker 必须：
- 在 docs 里保留
- 在 handoff 里保留
- 不得被伪装成 frontend success

---

## 8. Future Backend Asks, Not Required Now

未来如果要继续缩小 frontend orchestration，可以考虑：
- authoritative resident-device mapping
- aggregated Position summary DTO
- normalized zone metadata endpoint
- typed Position activity summary endpoint

这些都不是 Phase 3 requirement。

---

## 9. Review Rule

审 Position frontend PR 时，必须检查：
- no backend file diff
- no route path diff
- no payload shape drift
- no raw backend parsing leaked into component layer
- no frontend-only workaround pretending to be backend contract

只要以上仍然成立，这个 PR 仍属于 Position frontend work。
