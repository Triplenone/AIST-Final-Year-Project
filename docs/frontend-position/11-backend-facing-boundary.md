# Position Command Center Backend-Facing Boundary

## 1. Purpose

这份文档定义 Position frontend rebuild 对 backend 的实际依赖边界。

读者:
- backend engineer
- frontend maintainer
- API reviewer
- future Codex

---

## 2. Current Frontend Inputs

Position Phase 2 当前安全使用的 frontend API 只有两类:

### 2.1 Latest resident state
- `mongoUpstreamApi.getLatest({ device_id, data_type: 'status_update' })`

用途:
- current upstream snapshot
- truthState
- freshnessLevel
- riskLevel
- currentZone / targetZone

### 2.2 Selected-resident recent activity
- `mongoUpstreamApi.list({ device_id, data_type: 'status_update', page, page_size })`

用途:
- recent activity synthesis
- latest sync context
- zone/vitals transition hints

---

## 3. What Frontend Derives Locally

当前 frontend 负责 derivation:
- timestamp normalization
- truth classification
- freshness classification
- risk classification
- priorityBand
- priorityReasonCode
- zoneCommandState
- recent activity synthesis
- resident ordering

当前 backend 仍然是 raw data provider。

---

## 4. What Frontend Must Not Change

Position frontend 不得改动:
- backend route path
- response payload shape
- backend validation logic
- Mongo upstream route behavior
- MySQL schema
- event creation logic
- data reception flow
- FastAPI app structure

如果未来需要变 backend contract:
- 必须开新 workstream
- 不要伪装成 Position frontend cleanup

---

## 5. Payload Reality

当前已验证的 payload reality:
- `server_received_at` 可能是 ISO string
- seed Mongo data 里 `server_received_at` 可能是 `{ "$date": "..." }`
- `location`, `fall_detection`, `sos`, `sensors`, `system` 可能出现在 top-level
- 也可能出现在 `payload.*`

所以 frontend 必须继续做 defensive parsing。

---

## 6. Why SQL Event/DataLog APIs Are Not Phase 2 Sources

以下 API 在 repo 中存在:
- `eventApi.list`
- `deviceDataLogApi.list`
- `deviceDataLogApi.searchElderDetail`

但当前 Phase 2 不把它们作为 Position command logic source。

原因:
- frontend registry 目前仍是 frontend-owned
- repo 里没有 authoritative resident-device-event normalized mapping
- 这些 SQL APIs 不能稳定映射到当前 Position resident rail

允许:
- backend 团队单独推进 authoritative mapping

不允许:
- 在 Position component 里做 ad hoc join
- 在 JSX 里写 fuzzy resident/device/event matching

---

## 7. Future Backend Asks, Not Required Now

未来如果 backend 要减少 frontend orchestration，最有价值的增强是:
- authoritative resident-device mapping
- aggregated Position summary DTO
- latest active event summary endpoint
- normalized zone metadata endpoint
- typed Position command payload

这些 enhancement 不是 Phase 2 前置条件。

---

## 8. Review Rule

审查 Position frontend PR 时要确认:
- 没有 backend file diff
- 没有 route path diff
- 没有 payload shape drift
- 没有把 raw backend parsing 扔回 component layer
- recent activity 仍然只依赖当前允许的数据源

如果答案不是全部 yes，就不算安全的 Position frontend work。

---

## 9. Runtime Blocker Note

当前 live backend validation 仍然被已知问题阻塞:
- `backend/backend/.env` 包含 extra keys
- 当前 `Settings` validation 在 app boot 前直接失败

这个 blocker:
- 已知
- 已记录
- 不属于当前 frontend-only workstream
