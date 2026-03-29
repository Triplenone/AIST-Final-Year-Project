# Position Map Stage Emphasis and Surface Unification Workstream

## Objective

- raise the center map stage to the primary operator surface on `/position`
- unify the map command strip, frame, and legend into one clearer stage system
- keep the change CSS-scoped and preserve Position logic

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- a clinical command board: the middle stage should read first, with a stronger framed map surface and calmer supporting rails

## Target files

- `frontend/src/styles/position-page.css`
- `docs/frontend-position/16-position-map-stage-emphasis-workstream.md`

## Protected surfaces

- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/components/position/PositionMapStage.tsx`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- backend files and payload contracts
- route contract
- auth persistence
- theme persistence

## Forbidden changes

- no adapter or polling changes
- no route or state-flow changes
- no backend changes
- no resident-rail or decision-panel restructuring
- no FlyCare edits

## Acceptance

- the center column is visually dominant on desktop without causing overflow
- map stage header, command strip, frame, and legend read as one cohesive surface
- the map canvas has stronger framing and depth in light and dark mode
- mobile still stacks cleanly without horizontal overflow
- existing Position interactions remain unchanged

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/position` in light, dark, and mobile
- inspect `git diff --name-only`
