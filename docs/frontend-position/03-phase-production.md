# Phase 3, Production

## 1. Phase Goal

Make Position production-grade and maintainable.

This phase is about:
- complete page states
- responsive finishing
- motion safety
- accessibility finishing
- performance cleanup
- documentation closure
- handoff readiness

This phase is not about:
- backend redesign
- new backend endpoints
- FlyCare feature expansion
- unrelated app-wide redesign

---

## 2. Why This Phase Exists

Phase 1 makes Position trustworthy.  
Phase 2 makes Position decision-capable.  
Phase 3 must make Position stable enough for long-term maintenance.

A command center is not complete if it only works in the happy path.

It must also handle:
- loading
- empty
- error
- stale
- reduced motion
- small screens
- keyboard focus
- safe handoff

Without this phase, Position remains a strong prototype, not a finished primary page.

---

## 3. Phase Scope

### 3.1 In Scope
- loading state finishing
- empty state finishing
- error state finishing
- stale state finishing
- responsive finishing
- reduced motion finishing
- keyboard and focus finishing
- performance cleanup
- docs closure
- handoff packaging
- regression validation

### 3.2 Out of Scope
- backend changes
- new backend contracts
- FlyCare redesign
- Admin redesign
- Overview redesign
- brand-new product modules unrelated to Position

---

## 4. Protected Surfaces

Protected:
- backend
- FlyCare
- route paths
- app shell stability
- auth persistence
- theme persistence

Do not modify:
- backend files
- backend response contract
- `frontend/src/pages/FlyCarePage.tsx`
- unrelated non-Position pages unless strictly required for safe integration

---

## 5. Required Inputs

This phase assumes:
- Phase 1 is complete
- Phase 2 is complete
- Position already has dedicated components
- Position already has dedicated CSS boundary
- Position already has command-layer view model
- Position already has risk and freshness states

If these are not done, Phase 3 should not start.

---

## 6. Production Objectives

## 6.1 Complete Page-State Coverage
Position must cover all primary UI states:
- loading
- empty
- error
- stale
- normal
- warning
- critical

Rule:
No major state should fall back to broken layout or silent failure.

## 6.2 Responsive Finishing
Position must remain readable across common desktop and smaller viewport widths.

Minimum requirements:
- first screen remains understandable
- resident rail does not collapse into unusable clutter
- map stage does not break proportions
- decision panel does not become unreadable
- no major overflow on standard widths

## 6.3 Reduced Motion Support
If reduced motion is requested, Position must remain fully usable.

Requirements:
- no delayed content reveal that hides critical data
- no animation-dependent meaning
- no motion that blocks reading
- no flicker on state updates

## 6.4 Keyboard and Focus Safety
Core Position interactions must remain navigable and readable via keyboard.

Minimum targets:
- resident selection
- refresh actions
- key action buttons
- meaningful focus visibility
- no focus trap in normal page usage

## 6.5 Performance Cleanup
Position should reduce avoidable computation and rendering overhead.

Typical cleanup targets:
- repeated parsing in render
- repeated derived-state computation
- noisy polling side effects
- heavy component rerenders
- scattered utility duplication

## 6.6 Documentation Closure
At the end of this phase, docs must be enough for:
- future Codex
- future maintainer
- reviewer with no chat history
- backend engineer checking boundaries

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

### 7.2 Docs expected to change
- `docs/frontend-position/03-phase-production.md`
- `docs/frontend-position/10-maintainer-notes.md`
- `docs/frontend-position/11-backend-facing-boundary.md`
- `docs/frontend-position/99-handoff.md`
- `docs/README.md`

### 7.3 Files that may receive minimal integration edits
- `frontend/src/App.tsx`
- `_ben_mem/CURR.mem`
- `_ben_mem/LOG/*`

Rule:
Keep non-Position changes minimal and justified.

---

## 8. Work Packages

## WP1. Loading and Empty States
Add explicit loading and empty handling for:
- resident rail
- summary bar
- map stage context
- decision panel
- recent activity block

Rules:
- loading must not look like broken UI
- empty must explain why data is absent
- empty must not pretend normal state

## WP2. Error and Stale States
Add clear fallback handling for:
- API failure
- partial data failure
- stale upstream status
- missing zone resolution
- missing resident metadata

Rules:
- error must be visible
- stale must be visible
- stale must not be styled as live healthy state

## WP3. Responsive Finishing
Finish layout behavior for:
- standard desktop
- medium width laptop
- narrower viewport
- single-column fallback where needed

Rules:
- map remains central
- priority information remains first
- no layout collapse that hides command meaning

## WP4. Motion and Accessibility Finishing
Add or verify:
- reduced motion compatibility
- visible focus states
- meaningful aria labeling where needed
- keyboard-safe interaction path

Rules:
- critical information must not depend on animation
- keyboard users must still reach primary controls
- focus order must stay understandable

## WP5. Performance Cleanup
Review and reduce:
- duplicated parsing
- repeated derived calculations
- render-time heavy logic
- unnecessary state churn
- duplicated zone or risk logic

Preferred direction:
- adapter first
- util second
- thin component render

## WP6. Documentation and Handoff
Close the rebuild with:
- updated phase doc
- updated maintainer notes
- updated backend boundary doc
- final `99-handoff.md`
- updated `_ben_mem`

---

## 9. UX Rules for This Phase

### 9.1 Never hide command meaning
Even in loading, stale, or error states, the operator must still understand:
- current health of the page
- whether data is fresh
- whether action is needed

### 9.2 Never fake completeness
If data is missing, say it is missing.  
Do not fill gaps with misleading calm-looking UI.

### 9.3 Never let polish override clarity
Visual finishing must not reduce state legibility.

### 9.4 Never let motion become a dependency
Motion may support hierarchy.  
Motion must not become the only way to understand hierarchy.

---

## 10. Acceptance Criteria

Phase 3 is complete only if all are true:

1. loading state exists and is readable
2. empty state exists and is readable
3. error state exists and is readable
4. stale state exists and is readable
5. Position remains usable on common viewport widths
6. reduced motion mode does not break meaning
7. keyboard focus is visible on key interactions
8. build passes
9. backend remains untouched
10. FlyCare remains unaffected
11. docs are complete
12. `_ben_mem` logs are complete
13. final handoff doc exists

---

## 11. Validation Checklist

- build passes
- Position route renders
- loading state is visible and safe
- empty state is visible and safe
- error state is visible and safe
- stale state is visible and safe
- no major overflow on standard viewport widths
- focus is visible on resident selection and action controls
- reduced motion does not delay critical content
- no backend diff
- FlyCare route still renders
- docs updated
- handoff updated

---

## 12. Risks

### Risk 1
Too much polish work hides unresolved structural issues

Mitigation:
only start Phase 3 after Phase 1 and Phase 2 are truly complete

### Risk 2
Responsive fixes turn into layout hacks

Mitigation:
keep map, rail, and decision panel hierarchy stable

### Risk 3
Accessibility becomes checkbox work only

Mitigation:
focus on real interaction paths, not surface labels only

### Risk 4
Performance cleanup causes logic regressions

Mitigation:
clean up only after state model is stable

### Risk 5
Docs are left behind at the finish line

Mitigation:
Phase 3 is not complete until handoff docs are done

---

## 13. Done Output

At phase end, the repo should clearly contain:
- production-grade Position page states
- responsive-safe Position layout
- reduced-motion-safe Position behavior
- keyboard-safe core interactions
- cleaned command-center rendering path
- updated docs
- updated `_ben_mem`
- final handoff package

This phase is a success when Position becomes stable enough to serve as the maintained primary command center of the project.