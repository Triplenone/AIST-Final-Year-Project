# Phase 2, Command

## 1. Phase Goal

Make Position decision-capable.

This phase is about:
- derived state
- risk visibility
- freshness visibility
- prioritization
- zone intelligence
- operator-facing command-center behavior

This phase is not about:
- backend redesign
- full product polish
- deep performance optimization
- final accessibility sweep

---

## 2. Why This Phase Exists

Phase 1 solves trust and structure.  
Phase 2 must solve command value.

A trustworthy page is still not enough.  
Position must tell the operator:
- who needs attention
- where they are
- how urgent the situation is
- what likely needs to happen next

Without this layer, Position remains a cleaned-up display page, not a real command center.

---

## 3. Phase Scope

### 3.1 In Scope
- add risk engine
- add freshness engine
- add zone intelligence
- add resident prioritization
- add recent activity context
- enhance map working-state
- turn right panel into a true decision panel

### 3.2 Out of Scope
- backend API changes
- full visual finishing
- final accessibility hardening
- global app redesign
- FlyCare feature change
- Admin feature redesign

---

## 4. Protected Surfaces

Protected:
- backend
- FlyCare
- app shell stability
- route paths
- session persistence
- theme persistence

Do not modify:
- backend files
- backend payload contract
- `frontend/src/pages/FlyCarePage.tsx`
- unrelated pages outside Position scope

---

## 5. Required Inputs

This phase assumes Phase 1 already produced:
- thinner `PositionPage.tsx`
- Position-specific components
- Position-specific CSS boundary
- initial view model
- coherent online-state logic

If these are not done, Phase 2 should not start.

---

## 6. Command-Layer Objectives

## 6.1 Risk Engine
Position must classify each resident into usable command states.

Recommended levels:
- `stable`
- `warning`
- `critical`

Suggested logic:
- `sosState = true` => `critical`
- confirmed fall => `critical`
- abnormal heart rate or abnormal SpO2 => `warning`
- stale data => `warning` or separate stale emphasis
- no active issue => `stable`

Rule:
Risk must come from unified frontend logic, not scattered JSX conditions.

## 6.2 Freshness Engine
Position must classify data freshness.

Recommended levels:
- `live`
- `delayed`
- `stale`

Suggested basis:
- `server_received_at`
- latest log timestamps
- known polling interval
- current TTL contract

Rule:
Freshness must be visible in both summary area and resident rail.

## 6.3 Zone Intelligence
Position must convert coordinate state into operator-readable location intelligence.

Minimum outputs:
- `currentZone`
- `targetZone`
- active zone highlight
- selected resident context
- next movement intent hint

Optional derived hints:
- same-zone or cross-zone movement
- target reached or target pending
- current-to-target mismatch emphasis

## 6.4 Resident Prioritization
Resident rail must stop being a passive list.

Sort priority recommendation:
1. critical
2. warning
3. stale
4. stable

Tie-breakers may include:
- newest event first
- most recent update first
- explicit active selection first

## 6.5 Recent Activity Context
The right panel should expose recent activity, not only current raw status.

Possible sources:
- `eventApi.list`
- `deviceDataLogApi.list`
- `deviceDataLogApi.searchElderDetail`

Minimum command value:
- latest active event
- latest meaningful status change
- latest sync time
- next action hint

---

## 7. File-Level Plan

### 7.1 Main files expected to change
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- `frontend/src/styles/position-page.css`

### 7.2 Files that may receive minimal integration edits
- `frontend/src/App.tsx`

Rule:
`App.tsx` should only receive safe integration changes if absolutely needed.  
Core work belongs inside Position-specific files.

---

## 8. Work Packages

## WP1. Expand the View Model
Extend the Position adapter to produce command-grade fields.

Required outputs:
- `riskLevel`
- `freshnessLevel`
- `currentZone`
- `targetZone`
- `activeEventId`
- `recentActions`
- `nextActionLabel`

Optional outputs:
- `isTargetReached`
- `zoneAlertLevel`
- `lastMeaningfulChange`

Rule:
render components should consume these derived fields, not rebuild logic locally.

## WP2. Upgrade Resident Rail
Convert the resident list into a priority rail.

Each row should show:
- display name
- active status
- online or stale signal
- risk chip
- last seen or freshness cue

Expected behaviors:
- sorted by command priority
- active resident is visually clear
- stale residents are not displayed as healthy online users

## WP3. Upgrade Map Stage
Map must become a work surface.

Minimum additions:
- current pin
- target pin
- active zone highlight
- selected resident context
- summary strip

Desired result:
Operator reads map and immediately understands present state, not just coordinates.

## WP4. Upgrade Decision Panel
Right panel must move beyond summary-first and become action-relevant.

Top layer:
- live state
- risk level
- current zone
- battery
- heart rate
- SpO2

Second layer:
- target zone
- fall state
- SOS state
- freshness state
- next action hint

Third layer:
- device id
- raw coordinates
- raw timestamps
- secondary metadata

## WP5. Add Recent Activity
Add a compact recent activity block.

Candidate items:
- latest event
- latest warning trigger
- latest data sync
- latest recovery or return-to-normal state

Rule:
This is not a full analytics history.  
This is a command summary.

---

## 9. UX Rules for This Phase

### 9.1 Command-first reading order
The page must answer these questions quickly:
1. who is selected
2. what is their risk
3. where are they now
4. what is the target
5. what needs attention next

### 9.2 No raw-first panel
Do not let raw coordinates or device id dominate the panel.

### 9.3 No fake calm state
Do not display stale data as current healthy state.

### 9.4 State colors must be semantically stable
Recommended semantic mapping:
- stable => calm
- warning => amber
- critical => red
- stale => clearly downgraded or dimmed

---

## 10. Acceptance Criteria

Phase 2 is complete only if all are true:

1. selected resident updates left, center, right coherently
2. resident rail is priority-based, not passive
3. risk state is clearly visible
4. freshness state is clearly visible
5. map includes current context and target context
6. right panel becomes decision-oriented
7. recent activity block exists
8. `npm run build` passes
9. backend remains untouched
10. FlyCare remains unaffected
11. docs are updated
12. `_ben_mem` logs are updated

---

## 11. Validation Checklist

- selected resident change updates the whole page
- critical resident appears above stable resident
- stale resident does not appear as healthy online state
- risk chip and freshness signal are both visible
- active zone highlight works
- current pin and target pin both render correctly
- recent activity block renders without breaking layout
- no backend diff
- FlyCare route still renders
- build passes

---

## 12. Risks

### Risk 1
Risk logic becomes scattered across components

Mitigation:
keep risk resolution inside adapter or utility layer

### Risk 2
Freshness and online status become duplicated concepts

Mitigation:
define clear semantics and use them consistently

### Risk 3
Map enhancements become visual noise

Mitigation:
only add state elements that improve command reading

### Risk 4
Recent activity grows into a heavy history module

Mitigation:
keep it compact and operator-focused

### Risk 5
Command phase starts compensating for missing backend with ad hoc hacks

Mitigation:
prefer stable adapter logic over one-off JSX fixes

---

## 13. Done Output

At phase end, the repo should clearly contain:
- expanded command-oriented Position view model
- prioritized resident rail
- map with current and target context
- decision-oriented right panel
- recent activity context block
- updated phase doc
- updated `_ben_mem`

This phase is a success when Position stops behaving like a cleaned-up monitor page and starts behaving like a command center.