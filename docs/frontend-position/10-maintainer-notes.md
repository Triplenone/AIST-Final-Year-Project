# Position Command Center Maintainer Notes

## 1. Purpose

这份文档给后续 maintainer、backend engineer、reviewer、future Codex 使用。

目标:
- 快速理解 Position 当前 contract
- 快速理解 Phase 1 和 Phase 2 的边界
- 快速理解哪些逻辑必须留在 adapter

---

## 2. Current Repo Reality

当前 Position 已经不是 monolithic page。

当前结构:
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- `frontend/src/styles/position-page.css`

当前保护面:
- `backend/backend/**`
- `frontend/src/pages/FlyCarePage.tsx`
- route contract
- auth persistence
- theme persistence

---

## 3. Page Responsibility Rule

`PositionPage.tsx` 只负责 orchestration:
- snapshot polling
- selected resident state
- selected-resident activity loading
- highlighted zone state
- modal edge detection
- component composition

禁止把以下逻辑拉回 page:
- truth classification
- freshness classification
- risk classification
- priority sorting
- zone command derivation
- recent activity synthesis

---

## 4. Adapter Contract

Position UI 必须消费 adapter/view model。

核心状态字段:
- `truthState = online | stale | offline`
- `freshnessLevel = live | delayed | stale`
- `riskLevel = stable | warning | critical`
- `priorityBand = critical | warning | stale-only | stable`
- `priorityReasonCode = critical-sos | critical-fall | warning-vitals | warning-offline | stale-data | stable-monitoring`
- `zoneCommandState = holding | target-pending | target-reached | zone-unknown`

关键 view model 字段:
- `currentZoneId`
- `currentZoneLabelKey`
- `currentZoneName`
- `targetZoneId`
- `targetZoneLabelKey`
- `targetZoneName`
- `recentActivity`
- `activityBlockedReason`
- `priorityTimestamp`

Rule:
- render layer 不得在 JSX 里再算一套 status
- rail、summary bar、map、decision panel 必须共用同一份 adapter state

---

## 5. Priority Rule

`priorityBand` 是 command ordering layer。

不是:
- 第二套 truth model
- 第二套 risk level

当前排序:
1. `priorityBand`
2. `riskLevel`
3. `priorityTimestamp`
4. `lastSeenAt`
5. `displayName`

当前 band 语义:
- `critical`: SOS / confirmed fall
- `warning`: abnormal vitals / offline link
- `stale-only`: stale but not escalated
- `stable`: online and calm

---

## 6. Recent Activity Rule

Phase 2 recent activity 只允许使用:
- `mongoUpstreamApi.list({ device_id, data_type: 'status_update' })`

原因:
- 当前 repo 没有 authoritative resident-device-event mapping
- SQL `eventApi` 和 `deviceDataLogApi` 不能安全绑定到 frontend-owned registry

当前 recent activity 只服务 selected resident。

允许状态:
- ready
- empty
- blocked

不允许:
- fake live history
- invented backend endpoint
- scattered activity parsing in component layer

---

## 7. Zone Rule

Zone logic 仍然必须留在 adapter。

当前 zone contract:
- `currentZone`
- `targetZone`
- `zoneCommandState`

当前 `zoneCommandState` 语义:
- `holding`
- `target-pending`
- `target-reached`
- `zone-unknown`

Map Stage 只负责显示:
- current zone emphasis
- target zone emphasis
- inspected zone emphasis

---

## 8. CSS Boundary Rule

Position growth 只能进入:
- `frontend/src/styles/position-page.css`

`frontend/src/styles/global.css` 当前只保留:
- FlyCare legacy `.position-page__*`
- shared integration leftovers

不要把新的 Position rules 写回 `global.css`。

---

## 9. Test Rule

Phase 2 起，adapter logic 必须有 test coverage。

当前 test file:
- `frontend/src/adapters/position-command-center.test.ts`

最少要守住:
- timestamp parsing
- truth/freshness derivation
- priority ordering
- zone command derivation
- recent activity synthesis
- blocked activity behavior

---

## 10. Read Order

维护 Position 前建议按这个顺序读:
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. `docs/frontend-position/00-master-plan.md`
4. `docs/frontend-position/00-governance.md`
5. 当前 phase doc
6. `docs/frontend-position/11-backend-facing-boundary.md`
7. `frontend/src/adapters/position-command-center.ts`
8. `frontend/src/pages/PositionPage.tsx`

---

## 11. Write Discipline

每次 Phase work 必须同步:
- phase doc
- maintainer notes
- handoff
- `_ben_mem/CURR.mem`
- `_ben_mem/LOG/*`

`_ben_mem` 规则:
- one fact per line
- `KEY=VALUE`
- ASCII first
- 保留 exact branch 和 path

---

## 12. Next Trigger

只有在以下条件满足后，才考虑更深的 Position phase:
- backend 提供 authoritative resident-device mapping
- backend 提供 stable Position-oriented event summary
- Phase 2 command behavior 经 runtime 验证稳定

在那之前:
- 不要把 Position 变成 full history module
- 不要把 backend workaround 塞进 component layer
