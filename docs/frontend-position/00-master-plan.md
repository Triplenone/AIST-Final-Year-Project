# Position Command Center Rebuild Master Plan

## 1. Project Definition

### 1.1 Project Name
Position Command Center Rebuild

### 1.2 Core Goal
Rebuild `frontend/src/pages/PositionPage.tsx` into the primary command center of the project, without changing any backend API, backend schema, backend routes, or backend event logic.

### 1.3 Final Outcome
The Position page must become:
- the primary monitoring page
- the primary decision-support page
- the primary demo page for indoor monitoring
- a maintainable frontend architecture, not a one-off demo patch

### 1.4 Repo Baseline
This plan is based on the current `main` branch of:
- repo: `Triplenone/AIST-Final-Year-Project`
- main frontend entry: `frontend/`
- backend app root: `backend/backend/`

Direct GitHub links:
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/README.md`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/package.json`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/App.tsx`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/pages/PositionPage.tsx`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/services/api.ts`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/src/styles/global.css`

---

## 2. Current State Diagnosis

### 2.1 What is already upgraded
The app shell has already moved into a newer architecture.

Evidence:
- `App.tsx` already imports `tokens.css`, `app-shell.css`, `overview.css`
- shell-level components already exist, such as:
  - `AppHeader`
  - `QuickActionsDock`
  - `AuthModal`
  - `OverviewExperience`
- page switching is already route-driven

Conclusion:
The app shell is no longer the main problem.

### 2.2 What is still outdated
`PositionPage.tsx` is still a monolithic page.

It still mixes:
- user preset data
- online state logic
- polling logic
- zone mapping
- coordinate parsing
- alert detection
- map rendering
- right-panel rendering

It is still old-generation page architecture.

### 2.3 Main product problem
Position is still closer to a demo page than a real command center.

Current visible problems:
- user list and online state are not based on a single source of truth
- right panel is still raw field dump, not decision-first information
- Position-specific rules are still deeply coupled to `global.css`
- the page is not using a dedicated view model layer
- Location is still present in navigation, but product direction has shifted to Position-first

---

## 3. Strategic Direction

### 3.1 Product Direction
Do not treat Position as a prettier map page.

Treat Position as the only primary command center.

### 3.2 Technical Direction
Do not wait for backend changes.

Use frontend orchestration:
- backend provides raw data
- frontend aggregates data
- frontend derives risk
- frontend derives freshness
- frontend derives zone intelligence
- frontend decides information priority
- frontend drives command-center UX

### 3.3 Execution Direction
Do not rebuild the whole app.

Only rebuild Position first.

---

## 4. Scope

### 4.1 In Scope
- rebuild `PositionPage`
- create Position-only component structure
- create Position-only adapter or view-model layer
- create Position-only CSS file
- create Position-only docs
- create Position-only `_ben_mem` execution discipline
- absorb useful location intelligence into Position
- make Position the primary indoor monitoring command page

### 4.2 Out of Scope
- backend route changes
- backend payload changes
- backend schema changes
- backend event generation changes
- FlyCare core logic changes
- full app-wide redesign
- Location page enhancement as a primary goal

---

## 5. Hard Constraints

### 5.1 Backend Freeze
Do not modify:
- FastAPI routes
- response payload shape
- database schema
- data reception flow
- event creation logic
- mongo-upstream API behavior

### 5.2 FlyCare Protection
Do not modify:
- `frontend/src/pages/FlyCarePage.tsx` logic
- FlyCare route behavior
- FlyCare page-specific workflow

### 5.3 Route Stability
Do not change:
- route paths
- top-level navigation contract
- session storage behavior
- theme storage behavior

### 5.4 CSS Boundary
Do not keep adding new Position-specific rules into `frontend/src/styles/global.css`.

Create a dedicated `position-page.css`.

### 5.5 Documentation Discipline
All major changes must be reflected in:
- `docs/frontend-position/*.md`
- `_ben_mem/*`

---

## 6. Architecture Strategy

### 6.1 Data Layer
Position must stop depending on a single latest-status path only.

Use existing frontend API layer from:
- `mongoUpstreamApi`
- `eventApi`
- `deviceDataLogApi`
- `residentApi`
- `deviceApi`
- `locationApi`

Source file:
- `frontend/src/services/api.ts`

### 6.2 View Model Layer
Create a Position-specific adapter.

Suggested file:
- `frontend/src/adapters/position-command-center.ts`

Suggested output shape:
- `residentId`
- `displayName`
- `deviceId`
- `isOnline`
- `freshnessLevel`
- `riskLevel`
- `currentZone`
- `targetZone`
- `currentCoords`
- `targetCoords`
- `heartRate`
- `spo2`
- `battery`
- `fallState`
- `sosState`
- `activeEventId`
- `lastSeenAt`
- `recentActions`
- `nextActionLabel`

Rule:
UI must consume the view model.  
UI must not directly assemble raw backend response shape everywhere.

### 6.3 Presentation Layer
Keep the three-column concept, but redefine it.

Left:
- Resident Rail

Center:
- Map Stage

Right:
- Decision Panel

---

## 7. Three-Phase Plan

### 7.1 Phase 1, Foundation
Goal:
Make Position trustworthy.

Main deliverables:
- split monolithic page
- unify online state logic
- create Position-only CSS
- add summary-first right panel
- create basic status strip above map

Success criteria:
- no contradiction between user list and online status
- first screen shows user, map, summary without awkward scrolling
- Position no longer depends on `global.css` for new page-specific growth
- build passes
- backend untouched

### 7.2 Phase 2, Command
Goal:
Make Position decision-capable.

Main deliverables:
- risk engine
- freshness engine
- zone intelligence
- resident prioritization
- recent event stream
- map state enhancement

Success criteria:
- one selected resident updates left, center, right coherently
- critical, warning, stale, stable are visible at a glance
- map becomes a working stage, not only a static image
- right panel becomes a decision panel

### 7.3 Phase 3, Production
Goal:
Make Position product-grade and maintainable.

Main deliverables:
- loading state
- empty state
- error state
- stale state
- responsive finishing
- reduced motion
- keyboard and focus finishing
- performance cleanup
- docs and handoff completion

Success criteria:
- complete page-state coverage
- maintainable structure
- stable UX
- clear handoff
- backend untouched
- FlyCare unaffected

---

## 8. Planned File Structure

### 8.1 New docs
- `docs/frontend-position/00-master-plan.md`
- `docs/frontend-position/00-governance.md`
- `docs/frontend-position/01-phase-foundation.md`
- `docs/frontend-position/02-phase-command.md`
- `docs/frontend-position/03-phase-production.md`
- `docs/frontend-position/99-handoff.md`

### 8.2 New frontend files
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- `frontend/src/styles/position-page.css`

### 8.3 Existing files expected to change
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/styles/global.css`

Rule:
`App.tsx` changes must stay minimal and route-safe.  
Main work must happen inside Position-specific files.

---

## 9. Risks

### 9.1 Scope explosion
Risk:
Position rebuild expands into full app redesign.

Control:
Only Position is active scope.

### 9.2 FlyCare regression
Risk:
shared shell or shared styles indirectly break FlyCare.

Control:
FlyCare is a protected surface in every phase.

### 9.3 Fake progress
Risk:
visual polish appears, but data model remains inconsistent.

Control:
Phase 1 must fix logic first, not visuals first.

### 9.4 CSS debt
Risk:
new Position rules keep leaking into `global.css`.

Control:
new rules go to `position-page.css`.

### 9.5 Documentation drift
Risk:
Notion and repo say different things.

Control:
repo docs become final source of truth once implementation starts.

---

## 10. Milestones

### M0
Planning and governance locked

### M1
Position is trustworthy

### M2
Position is decision-capable

### M3
Position is production-grade

---

## 11. Execution Order

1. lock governance
2. create docs
3. create `_ben_mem` protocol
4. execute Phase 1
5. execute Phase 2
6. execute Phase 3
7. finalize handoff

---

## 12. Definition of Done

This rebuild is done only when all conditions are true:
- Position is the primary indoor monitoring page
- Position has a dedicated architecture
- Position has a dedicated style boundary
- Position has coherent state logic
- Position has decision-first information hierarchy
- Position has complete docs
- Position has `_ben_mem` history
- backend remains unchanged
- FlyCare remains safe