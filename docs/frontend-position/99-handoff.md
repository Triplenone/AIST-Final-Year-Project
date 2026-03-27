# Position Command Center Handoff

## 1. Purpose

这份文档是 Position Command Center rebuild 的当前 handoff 基线。

适用对象:
- future Codex
- future frontend maintainer
- backend engineer
- reviewer with no prior chat context

你应该用它来:
1. 快速理解 Phase 1 和 Phase 2 已交付什么
2. 快速理解哪些边界不能被破坏
3. 快速理解下一次 Position work 应该从哪里继续

---

## 2. Rebuild Status

当前已完成:
- Phase 1, Foundation
- Phase 2, Command

当前未完成:
- Phase 3, Production

这意味着 Position 现在已经具备:
- adapter-led truth model
- summary-first hierarchy
- command-oriented resident ordering
- zone command context
- recent activity context

---

## 3. Current Architecture

当前主结构:
- page orchestrator: `frontend/src/pages/PositionPage.tsx`
- adapter: `frontend/src/adapters/position-command-center.ts`
- left rail: `PositionResidentRail`
- center stage: `PositionMapStage`
- top strip: `PositionSummaryBar`
- right panel: `PositionDecisionPanel`
- stylesheet: `frontend/src/styles/position-page.css`

Rule:
- Position logic 优先进入 adapter
- Position growth 不要回流到 `global.css`

---

## 4. Locked Frontend Contracts

Current state contracts:
- `truthState = online | stale | offline`
- `freshnessLevel = live | delayed | stale`
- `riskLevel = stable | warning | critical`
- `priorityBand = critical | warning | stale-only | stable`
- `zoneCommandState = holding | target-pending | target-reached | zone-unknown`

Current selected-resident activity contract:
- `recentActivity`
- `activityBlockedReason`

Current activity source:
- `mongoUpstreamApi.list({ device_id, data_type: 'status_update' })`

---

## 5. Protected Boundaries

Protected throughout the rebuild:
- backend files
- backend API contract
- backend schema
- FlyCare core workflow
- route paths
- auth persistence
- theme persistence

Practical meaning:
- do not modify `backend/backend/**`
- do not modify `frontend/src/pages/FlyCarePage.tsx`
- do not change route paths

---

## 6. Current Validation Reality

Verified:
- frontend build passes
- adapter tests pass
- Position code remains frontend-only

Known blocked runtime area:
- live backend validation

Blocker:
- `backend/backend/.env` contains extra keys rejected by current `Settings` validation

Rule:
- future runs must report this blocker honestly until it is separately fixed
- do not claim live backend success while this blocker remains

---

## 7. Current Risks

### Risk 1
Resident registry still contains one resident only.

Impact:
- runtime proof of multi-resident prioritization remains limited

### Risk 2
Resident-device mapping is still frontend-owned.

Impact:
- Position cannot safely absorb SQL event/device history as authoritative resident activity

### Risk 3
Future contributors may bypass the adapter and rebuild local logic in JSX.

Impact:
- left-center-right coherence will regress

---

## 8. Required Read Order for Future Work

Recommended read order:
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. `docs/frontend-position/00-master-plan.md`
4. `docs/frontend-position/00-governance.md`
5. current phase doc
6. `docs/frontend-position/10-maintainer-notes.md`
7. `docs/frontend-position/11-backend-facing-boundary.md`
8. target code files

---

## 9. Recommended Next Step

Next safe workstream:
- Phase 3, Production

But only after:
- current Phase 2 behavior stays stable
- `/position` and `/flycare` keep rendering cleanly
- backend blocker remains documented or is separately resolved

Do not reopen Phase 1.
Do not mix backend repair into Position frontend maintenance.
