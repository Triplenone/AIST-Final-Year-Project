# Phase 3, Production

## 1. Phase Goal

在不改 backend 的前提下，把 Position Command Center 收口到 production-grade。

本阶段只做 frontend hardening：
- page-state coverage
- responsive finishing
- reduced motion safety
- keyboard and focus safety
- render-path cleanup
- docs closure
- handoff closure

不做：
- backend fix
- backend contract change
- FlyCare rewrite
- Phase 1 / Phase 2 rollback

---

## 2. Repo Reality

进入 Phase 3 时，repo 已经有：
- Phase 1 foundation
- Phase 2 command layer
- adapter-led truth model
- dedicated Position CSS boundary
- wide desktop layout with centered map stage

当前已知 blocker：
- `backend/backend/.env` 有 extra keys
- 当前 `Settings` validation 会阻塞 backend boot
- frontend 只能做 blocked-state validation

---

## 3. Locked Contracts

以下语义在 Phase 3 不改：
- `truthState = online | stale | offline`
- `freshnessLevel = live | delayed | stale`
- `riskLevel = stable | warning | critical`
- `priorityBand = critical | warning | stale-only | stable`
- `zoneCommandState = holding | target-pending | target-reached | zone-unknown`

Phase 3 新增的是 surface-state layer，不是第二套 truth model：
- `PositionSurfaceState = loading | ready | empty | error | partial-error`
- `PositionActivityState = loading | ready | empty | blocked`

Rule:
- truth/risk/freshness 继续表达 resident state
- surface-state 只表达 page/surface availability

---

## 4. Delivered Work

### 4.1 Page-state coverage

以下 surface 都有显式 state：
- resident rail
- selected resident summary
- map-stage command surface
- decision panel
- recent activity block

规则：
- loading 不再伪装成 offline
- empty 不再伪装成 calm healthy state
- error 不再静默塌成 normal UI
- stale 会继续保留高可见度

### 4.2 Adapter cleanup

`frontend/src/adapters/position-command-center.ts` 现在负责：
- resident selection resolution
- surface-state derivation
- activity-state derivation
- selected-record error exposure
- partial failure counting

`frontend/src/pages/PositionPage.tsx` 保持 thin orchestration：
- snapshot polling
- selected resident state
- activity loading
- highlighted zone state
- component composition

不再为了选中 resident 和 activity effect 重复 build full view model。

### 4.3 Responsive finishing

Layout rule:
- wide desktop: 保持现有 `left / center / panel`
- medium laptop: 改为 map-first，先 `center + panel`，再 `left + panel`
- narrow width: stacked order 为 `center -> left -> panel`

Rule:
- map stage 始终是 primary visual surface
- 不允许把 map 再次压到次屏

### 4.4 Keyboard and motion safety

完成项：
- stronger focus-visible ring
- resident selection 保持 keyboard-safe
- refresh button 保持 keyboard-safe
- map blank cells 不再成为 tab stop
- map zone inspection 只保留有意义的 keyboard stop
- local reduced-motion fallback 不依赖 global CSS 才成立

---

## 5. Files Changed In This Phase

Primary frontend files:
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/adapters/position-command-center.test.ts`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- `frontend/src/styles/position-page.css`

Docs:
- `docs/frontend-position/03-phase-production.md`
- `docs/frontend-position/10-maintainer-notes.md`
- `docs/frontend-position/11-backend-facing-boundary.md`
- `docs/frontend-position/99-handoff.md`

Memory:
- `_ben_mem/CURR.mem`
- `_ben_mem/LOG/*`

---

## 6. Validation

Verified in this phase:
- `npm run build`
- `npm run test`
- `/position` preview renders
- `/flycare` preview renders
- no backend file touched
- no `frontend/src/pages/FlyCarePage.tsx` touched

Validated UI concerns:
- loading state visible
- empty state visible
- error state visible
- stale state stronger than Phase 2
- wide / medium / narrow layout rules updated
- focus visibility strengthened on key controls
- reduced motion no longer depends on motion for meaning

Blocked validation:
- healthy live backend validation

Blocker:
- `backend/backend/.env` extra keys rejected by current `Settings`

---

## 7. Maintainer Rules After Phase 3

- Do not move Position growth back into `global.css`.
- Do not reintroduce raw backend parsing into component render branches.
- Do not replace surface-state with implicit `null` checks.
- Do not make stale/offline UI look calm just to look cleaner.
- Do not demote map stage below the fold on laptop widths.
- Do not reopen backend scope inside Position frontend work.

---

## 8. Remaining Risks

- Frontend-owned resident registry 仍然只有 1 个 resident。
- 多 resident runtime 排序仍主要靠 adapter test，而不是 live scenario。
- backend blocker 未解除前，recent activity 只能验证 blocked path。
- bundle 仍有 large chunk warning，但这不是 Position-only blocker。

---

## 9. Phase Completion Status

Phase 3 在 frontend-only 范围内已定义为：
- explicit safe states
- clearer stale/error hierarchy
- stronger responsive behavior
- safer keyboard/focus handling
- reduced-motion-safe behavior
- maintainable docs and handoff

下一阶段如果继续，只能是 backend blocker 解除后的 runtime verification 或更高层 product iteration。
