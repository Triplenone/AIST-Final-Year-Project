# Position Command Center Handoff

## 1. Purpose

这份 handoff 给：
- future Codex
- future frontend maintainer
- backend engineer
- reviewer with no prior chat context

它要回答三件事：
1. Position rebuild 现在做到哪一层
2. 哪些 contract 已经锁定
3. 下一次进入 repo 时什么能做，什么不能做

---

## 2. Current Rebuild Status

已完成：
- Phase 1, Foundation
- Phase 2, Command
- Phase 3, Production hardening

当前 Position 不是原始 monolithic page。

当前交付包含：
- adapter-led truth model
- command-oriented resident ordering
- recent activity context
- explicit loading / empty / error / partial-error states
- stronger stale presentation
- map-first responsive behavior
- keyboard/focus hardening
- reduced-motion-safe behavior

---

## 3. Current Architecture

Current structure:
- page orchestrator: `frontend/src/pages/PositionPage.tsx`
- adapter: `frontend/src/adapters/position-command-center.ts`
- left rail: `PositionResidentRail`
- selected resident summary: `PositionSummaryBar`
- center stage: `PositionMapStage`
- right panel: `PositionDecisionPanel`
- stylesheet: `frontend/src/styles/position-page.css`

Rule:
- Position derivation stays in adapter
- Position growth stays out of `global.css`

---

## 4. Locked Frontend Contracts

Resident-state contract:
- `truthState = online | stale | offline`
- `freshnessLevel = live | delayed | stale`
- `riskLevel = stable | warning | critical`
- `priorityBand = critical | warning | stale-only | stable`
- `zoneCommandState = holding | target-pending | target-reached | zone-unknown`

Surface-state contract:
- `PositionSurfaceState = loading | ready | empty | error | partial-error`
- `PositionActivityState = loading | ready | empty | blocked`

Rule:
- resident state 和 surface state 不能混成一套

---

## 5. Protected Boundaries

Throughout the rebuild, the following remained protected:
- backend files
- backend API contract
- backend schema
- `frontend/src/pages/FlyCarePage.tsx`
- route paths
- auth persistence
- theme persistence

Still true now:
- no backend workaround belongs inside Position component render paths
- no Position-specific CSS belongs in `global.css`

---

## 6. Current Data Reality

Current safe frontend sources:
- `mongoUpstreamApi.getLatest(...)`
- `mongoUpstreamApi.list(...)`

Current limitation:
- resident registry is still frontend-owned
- repo still lacks authoritative resident-device-event mapping

Implication:
- recent activity is still selected-resident-only
- SQL `eventApi` and `deviceDataLogApi` are still out of scope for Position command logic

---

## 7. Runtime Validation Reality

Verified:
- `npm run build`
- `npm run test`
- `/position` preview renders
- `/flycare` preview renders

Still blocked:
- healthy live backend validation

Blocker:
- `backend/backend/.env` contains extra keys
- current `Settings` validation rejects them

Do not claim live backend success until that blocker is gone.

---

## 8. Current Layout Rule

Locked layout rule:
- wide desktop: left rail + selected resident summary, center map stage, right decision panel
- medium laptop: map-first layout
- narrow viewport: stacked `center -> left -> panel`

Hard rule:
- map stage stays primary
- do not demote map below the fold again

---

## 9. Current UX Rule

Position is now a command workspace, not a style exercise.

Keep:
- operator-readable labels
- visible stale/error states
- explicit empty states
- explicit blocked activity state
- visible focus on key controls

Do not:
- make stale/offline look calm just to look cleaner
- merge surface-state back into implicit `null` handling
- reopen Phase 1 / 2 structure for taste-only reasons

---

## 10. Recommended Next Step

Safe next work only after this handoff:
- backend blocker fix, then real live runtime validation
- or a new Position-only product layer with clear scope

Unsafe next work:
- backend contract rewrite hidden inside frontend PR
- fuzzy SQL/Mongo resident join in component layer
- FlyCare changes piggybacked onto Position work

If a future maintainer starts from this file plus `_ben_mem/CURR.mem`, they should not need prior chat history.
