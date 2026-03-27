# Position Command Center Handoff

## 1. ?﹝?桃?

?祆?獢?鈭?蝏?handoff??

霂餉??穿?
- future Codex
- future frontend maintainer
- backend engineer
- reviewer with no prior chat context

?格?嚗?
1. 敹恍秩??Position rebuild ??隞銋?
2. 敹恍秩?鈭器?◤靽
3. 敹恍秩??repo 敶?摨砲隞?誧蝏?
4. 敹恍秩?歇?仿??拐??賒撱箄悅

---

## 2. Project Summary

Position Command Center rebuild is a frontend-led rebuild of:
- `frontend/src/pages/PositionPage.tsx`

Primary intent:
- make Position the primary indoor monitoring page
- make Position decision-capable
- make Position maintainable
- keep backend frozen
- keep FlyCare protected

This rebuild is not a backend change program.  
This rebuild is not a full-app redesign.

---

## 3. Repo Baseline

Primary repo:
- `Triplenone/AIST-Final-Year-Project`

Primary frontend:
- `frontend/`

Main relevant files:
- `frontend/src/App.tsx`
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/styles/global.css`
- `frontend/src/styles/position-page.css`
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/components/position/*`

Main docs:
- `docs/frontend-position/00-master-plan.md`
- `docs/frontend-position/00-governance.md`
- `docs/frontend-position/01-phase-foundation.md`
- `docs/frontend-position/02-phase-command.md`
- `docs/frontend-position/03-phase-production.md`
- `docs/frontend-position/10-maintainer-notes.md`
- `docs/frontend-position/11-backend-facing-boundary.md`

---

## 4. What Was Rebuilt

The Position rebuild is organized into three phases:

### Phase 1, Foundation
Focus:
- trust
- structure
- CSS boundary
- summary-first layout
- coherent online state

### Phase 2, Command
Focus:
- risk
- freshness
- zone intelligence
- resident prioritization
- recent activity
- decision panel behavior

### Phase 3, Production
Focus:
- loading
- empty
- error
- stale
- responsive finishing
- motion safety
- accessibility finishing
- performance cleanup
- docs closure

---

## 5. Protected Boundaries

Protected throughout the rebuild:
- backend
- backend API contract
- backend schema
- FlyCare core workflow
- route paths
- session persistence
- theme persistence

Practical meaning:
- no backend files should be changed by this rebuild
- no FlyCare logic should be changed by this rebuild
- no silent contract drift should be introduced

---

## 6. Data Strategy

Position rebuild uses frontend orchestration.

Meaning:
- backend remains raw data provider
- frontend aggregates current data sources
- frontend derives:
  - online state
  - freshness
  - risk
  - zone intelligence
  - information priority

Main frontend data sources:
- `mongoUpstreamApi`
- `eventApi`
- `deviceDataLogApi`
- `residentApi`
- `deviceApi`
- `locationApi`

Reference:
- `frontend/src/services/api.ts`

---

## 7. Architecture Strategy

Target architecture:
- thin page
- strong adapter
- dedicated Position components
- dedicated Position CSS boundary
- docs-first maintenance
- mem-first machine continuity

Target main structure:
- `PositionResidentRail`
- `PositionMapStage`
- `PositionDecisionPanel`
- `PositionSummaryBar`
- `position-command-center.ts`
- `position-page.css`

---

## 8. What Was Explicitly Not Done

The rebuild does not include:
- backend endpoint redesign
- backend schema redesign
- FlyCare redesign
- full app shell redesign
- unrelated page refactors
- broad full-stack architecture rewrite

If future work needs those, start a new workstream.  
Do not hide them inside Position maintenance.

---

## 9. Current Maintenance Rules

When touching Position in the future:
1. read `_ben_mem/PROTO.md`
2. read `_ben_mem/CURR.mem`
3. read the relevant phase doc
4. read `10-maintainer-notes.md`
5. keep scope file-based
6. keep backend frozen unless a separate approved backend task exists
7. update docs
8. update `_ben_mem`
9. keep memory work repo-local at `E:\FYP\AIST-Final-Year-Project-main\_ben_mem`

Do not:
- patch blindly in JSX
- grow Position rules back into `global.css`
- rebuild scattered truth models
- let raw backend shape leak across all UI components
- use deprecated outer path `E:\FYP\_codex_mem`

---

## 10. Validation Rules for Future Changes

Any new Position change should still validate:
- build passes
- Position route renders
- command-center hierarchy remains intact
- stale data is not shown as healthy live state
- backend remains untouched unless separately approved
- FlyCare remains unaffected
- docs remain synchronized
- `_ben_mem` remains synchronized

---

## 11. Known Risks

### Risk 1
Future contributors may reintroduce logic into `PositionPage.tsx`

Control:
keep page thin and adapter-driven

### Risk 2
Future CSS may leak back into `global.css`

Control:
keep Position-specific growth inside `position-page.css`

### Risk 3
Future changes may mix command logic and display logic again

Control:
keep derivation inside adapter or utility layer

### Risk 4
Future backend changes may silently break adapter assumptions

Control:
check backend-facing boundary doc before consuming changed payloads

### Risk 5
Notion or external planning notes may drift from repo truth

Control:
repo docs remain final source of truth once implementation starts

---

## 12. Recommended Next Steps

If the rebuild is incomplete:
1. continue the next unfinished phase only
2. do not reopen already completed phase scope without reason
3. keep future prompts single-objective and file-scoped

If the rebuild is complete:
1. keep Position as the primary maintained indoor command page
2. evaluate whether Location should remain visible in nav
3. evaluate whether backend should later expose dedicated Position DTOs
4. keep FlyCare as a protected separate workflow

---

## 13. Read Order for Future Maintainers

Recommended read order:
1. `docs/frontend-position/00-master-plan.md`
2. `docs/frontend-position/00-governance.md`
3. current phase doc
4. `docs/frontend-position/10-maintainer-notes.md`
5. `docs/frontend-position/11-backend-facing-boundary.md`
6. `_ben_mem/PROTO.md`
7. `_ben_mem/CURR.mem`
8. target code files

---

## 14. Final Handoff Summary

Position Command Center rebuild is successful only if:
- Position is the primary indoor monitoring page
- Position is command-capable
- Position is maintainable
- backend remains frozen
- FlyCare remains protected
- docs remain complete
- `_ben_mem` remains usable
- future maintainers can continue without chat history

This document closes the rebuild package and defines the baseline for all future Position maintenance.