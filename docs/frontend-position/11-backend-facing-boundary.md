# Position Command Center Backend-Facing Boundary

## 1. 目的

这份文档定义 Position frontend rebuild 和 backend 之间的边界。

读者:
- backend engineer
- frontend maintainer
- API reviewer
- future Codex

## 2. Phase 1 允许使用的 frontend API

来源文件:
- `frontend/src/services/api.ts`

当前 frontend 可用 client:
- `mongoUpstreamApi`
- `eventApi`
- `deviceDataLogApi`
- `residentApi`
- `deviceApi`
- `locationApi`

Phase 1 truth 只依赖:
- `mongoUpstreamApi.getLatest({ data_type: 'status_update', device_id })`

原因:
- 当前 repo 没有可靠 resident-device-event normalized join
- Phase 1 目标是 truth 和 structure, 不是 backend aggregation

## 3. Frontend 在 Phase 1 自己负责什么

frontend 负责:
- timestamp normalization
- online / stale / offline classification
- freshness classification
- risk classification
- zone derivation
- summary-first information priority
- resident sorting

backend 仍然只是 raw data provider。

## 4. Frontend 明确不改什么

不要改:
- `/api/v1/*` route path
- response payload shape
- backend validation logic
- Mongo upstream route behavior
- MySQL schema
- event creation logic
- data reception flow
- FastAPI app structure

如果 Position 需要更好的 backend contract, 必须开新 workstream。

## 5. 当前已知 payload reality

已验证 reality:
- `server_received_at` 可能是 ISO string
- seed data 中 `server_received_at` 也可能是 `{ "$date": "..." }`
- `location`, `sos`, `fall_detection`, `sensors`, `system` 可能在 top-level
- 同样字段也可能嵌在 `payload.*`

因此 Phase 1 frontend 必须做 defensive parsing。

## 6. Phase 1 frontend assumptions

当前锁定假设:
- 住民与 `device_id` 的 authoritative mapping 暂时不存在
- frontend-owned registry 是临时但安全的 Phase 1 做法
- request fail 视为 `offline`
- 有文档但 timestamp 无法解释时视为 `stale`

这些是假设，不是 backend contract。

## 7. Future backend asks, not required now

未来如果要减少 frontend orchestration, 推荐 backend 提供:
- authoritative resident-device mapping
- aggregated Position summary DTO
- latest active event summary endpoint
- normalized zone metadata endpoint
- risk-oriented typed state payload

这些 enhancement 不属于 Phase 1。

## 8. Review rule

任何 Position frontend PR 都要先检查:
- 有没有改 backend file
- 有没有改 route path
- 有没有改 payload shape
- 有没有把 raw parsing 散落回多个 component

只要其中一个为 yes, 就不是合法的 Phase 1 Position work。

## 9. Hand-off note

如果 backend 团队后续变更 `mongo-upstream/latest` payload:
- 先更新这份 boundary doc
- 再更新 Position adapter
- 不要直接在 JSX 里补丁式兼容
