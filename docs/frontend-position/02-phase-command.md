# Phase 2, Command

## 1. Phase Goal

Make Position command-capable without changing backend.

This phase strengthens:
- risk visibility
- freshness visibility
- zone intelligence
- resident prioritization
- recent activity context
- left-center-right coherence

This phase does not include:
- backend redesign
- FlyCare changes
- full responsive sweep
- final accessibility sweep

---

## 2. Locked Phase 2 Contract

Phase 1 contracts remain active:
- `truthState = online | stale | offline`
- `riskLevel = stable | warning | critical`
- `PositionPage.tsx` stays thin
- Position growth stays inside `frontend/src/styles/position-page.css`

Phase 2 adds:
- `priorityBand = critical | warning | stale-only | stable`
- `priorityReasonCode = critical-sos | critical-fall | warning-vitals | warning-offline | stale-data | stable-monitoring`
- `zoneCommandState = holding | target-pending | target-reached | zone-unknown`
- `recentActivity`
- `activityBlockedReason`

Rule:
- `priorityBand` is a command ordering layer
- `priorityBand` is not a replacement for `truthState`
- `priorityBand` is not a second risk engine

---

## 3. Data Strategy

Phase 2 remains frontend-orchestrated.

Current safe data paths:
- `mongoUpstreamApi.getLatest({ device_id, data_type: 'status_update' })`
- `mongoUpstreamApi.list({ device_id, data_type: 'status_update', page, page_size })`

Phase 2 recent activity source:
- `mongoUpstreamApi.list`

Reason:
- current repo still has no authoritative resident-device-event mapping
- `eventApi.list` and `deviceDataLogApi.searchElderDetail` exist, but they do not safely join to the current frontend-owned registry

---

## 4. Delivered Work Packages

## WP1. Command Adapter Expansion
`frontend/src/adapters/position-command-center.ts` now derives:
- `truthState`
- `freshnessLevel`
- `riskLevel`
- `priorityBand`
- `priorityReasonCode`
- `zoneCommandState`
- `recentActivity`
- `activityBlockedReason`

## WP2. Priority Resident Rail
`PositionResidentRail` now shows:
- truth state
- risk level
- freshness level
- priority reason
- deterministic command ordering

## WP3. Stronger Map Stage
`PositionMapStage` now shows:
- current zone context
- target zone context
- zone command state
- current-zone cell emphasis
- target-zone cell emphasis
- inspected-zone cell emphasis

## WP4. Decision Panel Upgrade
`PositionDecisionPanel` now shows:
- truth, risk, freshness
- priority reason
- current zone
- target zone
- zone command state
- next action
- recent activity
- raw metadata only at the bottom

## WP5. Command Strip Upgrade
`PositionSummaryBar` now shows:
- selected resident
- truth state
- risk reason
- freshness
- current zone
- battery
- heart rate
- SpO2
- last update

## WP6. Adapter Test Coverage
`frontend/src/adapters/position-command-center.test.ts` locks:
- Mongo `$date` timestamp parsing
- truth and freshness derivation
- priority ordering
- zone command derivation
- recent activity synthesis
- blocked activity behavior

---

## 5. Sorting and Prioritization Rules

Resident sorting is now:
1. `priorityBand`
2. `riskLevel`
3. `priorityTimestamp`
4. `lastSeenAt`
5. `displayName`

Priority semantics:
- `critical`: SOS active or confirmed fall
- `warning`: abnormal vitals or offline device link
- `stale-only`: stale data without stronger alert
- `stable`: online + no alert + no abnormal vitals

---

## 6. Zone Intelligence Rules

Phase 2 zone outputs:
- `currentZone`
- `targetZone`
- `zoneCommandState`

Phase 2 zone command semantics:
- `holding`: no target zone is active
- `target-pending`: target exists and has not been reached
- `target-reached`: current and target align by zone or coords
- `zone-unknown`: current and target context are both unavailable

Rule:
- zone derivation stays in adapter
- render layer must not rebuild zone-state logic locally

---

## 7. Recent Activity Rules

Recent activity is intentionally lightweight.

It is not:
- a full history module
- a backend timeline replacement
- a SQL event dashboard

It is:
- a command summary for the selected resident
- derived from recent `status_update` upstream documents
- able to show empty state
- able to show blocked state

Current synthesized activity types:
- SOS active
- confirmed fall
- current zone changed
- target updated
- vitals warning
- fallback latest sync

---

## 8. Validation Status

Verified in this phase:
- `npm run build` passes
- `npm run test` passes
- adapter contracts compile cleanly

Runtime validation still required after code change:
- `/position` route renders
- `/flycare` route still renders
- no backend files changed
- no `frontend/src/pages/FlyCarePage.tsx` changes

Known blocker for live backend validation:
- local backend startup still fails before app boot
- blocker: `backend/backend/.env` contains extra keys rejected by current `Settings` validation

This blocker is outside current frontend scope.

---

## 9. Remaining Risks

### Risk 1
Current registry still contains one resident only.

Impact:
- runtime proof of multi-resident ordering remains limited

### Risk 2
Recent activity still depends on frontend-owned device mapping.

Impact:
- cannot safely join SQL event/device history to resident identity yet

### Risk 3
Future contributors may bypass the adapter and add local sorting logic in JSX.

Mitigation:
- keep adapter tests and maintainer notes current

---

## 10. Execution Status

Status:
- Phase 2 command foundation delivered in frontend-only mode
- adapter contract expanded
- resident rail, summary bar, map stage, and decision panel upgraded
- docs and `_ben_mem` must stay synchronized with further Phase 2 edits

Next recommended step:
- validate `/position` and `/flycare` render against the current frontend build
- keep backend blocker documented
- move to Phase 3 only after command behavior remains stable
