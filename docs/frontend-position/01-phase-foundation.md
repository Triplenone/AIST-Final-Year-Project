# Phase 1, Foundation

## 1. Phase Goal

Make Position trustworthy before making it advanced.

This phase is about:
- coherence
- state truth
- file boundaries
- information hierarchy
- initial maintainability

This phase is not about:
- broad cinematic polish
- cross-app redesign
- backend upgrades

---

## 2. Why This Phase Comes First

Current repo state shows that the app shell has already moved forward, but Position still lags behind.

Repo evidence:
- shell-driven app structure already exists in `frontend/src/App.tsx`
- Position is still a monolithic page in `frontend/src/pages/PositionPage.tsx`
- Position-specific rules still live inside `frontend/src/styles/global.css`

Direct GitHub links:
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/App.tsx`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/pages/PositionPage.tsx`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/styles/global.css`

The most visible trust problem today:  
user list and online state are not driven by a single truth model.

---

## 3. Phase Scope

### 3.1 In Scope
- create Position-specific architecture
- fix online-state contradiction
- create Position-specific style boundary
- convert right panel from raw dump to summary-first layout
- introduce basic status strip above map
- reduce responsibility of `PositionPage.tsx`

### 3.2 Out of Scope
- risk engine
- advanced timeline
- deep event orchestration
- full accessibility sweep
- full responsive finishing
- global app redesign

---

## 4. Protected Surfaces

Protected:
- backend
- FlyCare
- app route contract
- theme and auth persistence

Do not modify:
- backend files
- backend API shape
- `frontend/src/pages/FlyCarePage.tsx`
- unrelated feature pages

---

## 5. Required File Changes

### 5.1 New files
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- `frontend/src/styles/position-page.css`

### 5.2 Existing files expected to change
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/styles/global.css`

Rule:  
`App.tsx` and `global.css` should only receive minimal changes necessary for safe integration.  
Main change volume belongs in Position-specific files.

---

## 6. Work Packages

## WP1. Create Position View Model
Build a Position adapter that aggregates current frontend-available data.

Use existing frontend API layer:
- `mongoUpstreamApi`
- `eventApi`
- `deviceDataLogApi`
- `residentApi`
- `deviceApi`
- `locationApi`

Goal:  
stop rendering Position directly from scattered raw response logic.

Expected output fields:
- `displayName`
- `deviceId`
- `isOnline`
- `freshnessLevel`
- `currentZone`
- `targetZone`
- `heartRate`
- `spo2`
- `battery`
- `fallState`
- `sosState`
- `lastSeenAt`

## WP2. Split the Monolithic Page
Reduce `PositionPage.tsx` into orchestration only.

Target components:
- `PositionResidentRail`
- `PositionMapStage`
- `PositionDecisionPanel`
- `PositionSummaryBar`

## WP3. Fix the State Truth Problem
Replace the split truth model.

Current anti-pattern:
- left list is based on preset user rendering
- online status is based on another logic path

Target state:  
all displayed resident rows must clearly show:
- online
- offline
- stale

No contradiction allowed between title, count, and list state.

## WP4. Create CSS Boundary
Move new Position-specific page rules into:
- `frontend/src/styles/position-page.css`

`global.css` should stop being the growth surface for Position.

## WP5. Redesign the Right Panel
Turn it from raw field dump into two layers.

Top:
- status
- current zone
- battery
- heart rate
- spo2

Bottom:
- device id
- target zone
- fall state
- sos state
- raw coordinates
- last update

Rule:  
raw values must become secondary information.

## WP6. Add Basic Summary Strip
Add a compact top summary strip above the map.

Fields:
- selected resident
- online status
- current zone
- freshness
- last update

Purpose:  
allow fast reading before scanning the right panel.

---

## 7. UX Rules for This Phase

### 7.1 Left Rail
The resident list must become a compact resident rail.

Each item should show:
- name
- online or offline or stale state
- basic emphasis for active resident

### 7.2 Center Map
The map remains central, but must stop acting as an isolated static image.

Add:
- selected resident pin
- basic summary strip
- active visual focus

### 7.3 Right Panel
The right side must become readable in priority order.

Priority order:
1. status
2. zone
3. health summary
4. device and raw fields

---

## 8. Acceptance Criteria

Phase 1 is complete only if all are true:

1. `npm run build` passes
2. Position renders without breaking routing
3. user list and online state no longer contradict each other
4. right panel becomes summary-first
5. Position-specific styles are moved into dedicated file or files
6. no backend files are changed
7. no FlyCare regression is introduced
8. docs are updated
9. `_ben_mem` logs are updated

---

## 9. Validation Checklist

- build passes
- Position route loads
- user selection updates the page correctly
- no fake online display when data is stale or absent
- summary strip renders
- no visual overflow on standard desktop width
- no backend diff
- FlyCare route still renders

---

## 10. Risks

### Risk 1
Too much work remains in `PositionPage.tsx`

Mitigation:  
keep only orchestration there.

### Risk 2
CSS keeps leaking into `global.css`

Mitigation:  
create and enforce `position-page.css`.

### Risk 3
View model becomes too weak and UI keeps reading raw fields directly

Mitigation:  
codify the adapter contract early.

### Risk 4
Visual cleanup hides unresolved state inconsistency

Mitigation:  
logic fix before visual polish.

---

## 11. Done Output

At phase end, the repo should clearly contain:
- a thinner `PositionPage.tsx`
- Position-specific component files
- Position-specific adapter file
- Position-specific CSS file
- updated phase doc
- updated `_ben_mem`

This phase is a success when Position becomes believable.  
Not yet advanced.  
Believable first.