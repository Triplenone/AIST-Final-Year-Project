# Position Command Center Maintainer Notes

## 1. Purpose

这份文档给：
- frontend maintainer
- backend engineer
- reviewer
- future Codex

目标：
- 快速定位 Position contract
- 快速确认 Phase 1 / 2 / 3 已交付内容
- 防止把 state logic 再次散回 component layer

---

## 2. Current Repo Reality

Position 不是 monolithic page 了。

当前核心文件：
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- `frontend/src/styles/position-page.css`

Protected:
- `backend/backend/**`
- `frontend/src/pages/FlyCarePage.tsx`
- route contract
- auth persistence
- theme persistence

---

## 3. Page Responsibility Rule

`PositionPage.tsx` 只做 orchestration：
- snapshot polling
- selected resident state
- selected-resident activity loading
- highlighted zone state
- modal edge detection
- component composition

不要把以下逻辑放回 page：
- truth classification
- freshness classification
- risk classification
- priority sorting
- zone command derivation
- surface-state derivation
- recent activity synthesis

---

## 4. Adapter Contract

Resident state contract:
- `truthState = online | stale | offline`
- `freshnessLevel = live | delayed | stale`
- `riskLevel = stable | warning | critical`
- `priorityBand = critical | warning | stale-only | stable`
- `priorityReasonCode = critical-sos | critical-fall | warning-vitals | warning-offline | stale-data | stable-monitoring`
- `zoneCommandState = holding | target-pending | target-reached | zone-unknown`

Phase 3 surface contract:
- `PositionSurfaceState = loading | ready | empty | error | partial-error`
- `PositionActivityState = loading | ready | empty | blocked`

Rule:
- resident state 描述 resident 本身
- surface state 描述 UI surface availability
- 不要混用

---

## 5. Selection Rule

Selection 现在通过 adapter resolve。

Rule:
- invalid `selectedResidentId` 要自动回落到 sorted first resident
- page 不再为了 selection 和 activity effect 重复 build full view model

If you see two full `buildPositionCommandCenterViewModel(...)` paths in `PositionPage.tsx`, that is a regression.

---

## 6. Error And Empty Rule

Do not let `null` silently mean everything.

Current required distinctions:
- loading: upstream pending
- empty: no resident / no zone resolution / no recent activity
- error: selected record or page snapshot unavailable
- partial-error: some resident snapshots failed, but page still usable
- blocked: activity path unavailable

Rule:
- component render 只消费 adapter-provided availability state
- 不要在 JSX 里临时发明另一套 state matrix

---

## 7. Zone Rule

Zone logic 继续只放在 adapter。

Map Stage 只负责显示：
- current zone emphasis
- target zone emphasis
- inspected zone emphasis

Phase 3 keyboard rule:
- blank grid cells 不能进入 tab order
- zone inspection 必须保留 meaningful keyboard stop

---

## 8. CSS Boundary Rule

Position growth 只允许在：
- `frontend/src/styles/position-page.css`

`frontend/src/styles/global.css` 现在只保留：
- FlyCare legacy `.position-page__*`
- shared shell rules
- global reduced-motion baseline

不要把 Position-specific selectors 再写回 `global.css`。

---

## 9. Responsive Rule

Locked layout hierarchy:
- wide desktop: `left / center / panel`
- medium laptop: map-first
- narrow viewport: `center -> left -> panel`

Rule:
- map stage 必须始终是 primary surface
- 不允许为了 panel density 再把 map 压到底部

---

## 10. Test Rule

Current test file:
- `frontend/src/adapters/position-command-center.test.ts`

Phase 3 test coverage must include:
- timestamp parsing
- truth/freshness derivation
- priority ordering
- zone command derivation
- recent activity synthesis
- blocked activity behavior
- loading surface state
- empty snapshot behavior
- selected-record error behavior
- selection resolution behavior

---

## 11. Read Order

继续维护 Position 时，先读：
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. current phase doc
4. `docs/frontend-position/11-backend-facing-boundary.md`
5. `frontend/src/adapters/position-command-center.ts`
6. `frontend/src/pages/PositionPage.tsx`

---

## 12. Write Discipline

每次 Phase work 都必须更新：
- current phase doc
- maintainer notes
- backend boundary doc if assumptions changed
- handoff
- `_ben_mem/CURR.mem`
- `_ben_mem/LOG/*`

`_ben_mem` 规则：
- one fact per line
- `KEY=VALUE`
- ASCII first
- exact branch and path

---

## 13. Safe Next Trigger

下一次可以继续 Position 的前提：
- backend blocker 已解除，能做 live runtime verification
- 或者明确要做新的 Position-only product layer

不要做：
- component-layer backend workaround
- fuzzy resident/device/event join
- 非 Position 范围的 shell rewrite
