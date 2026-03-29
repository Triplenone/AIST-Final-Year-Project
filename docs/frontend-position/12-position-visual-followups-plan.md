# Proactive Guardian Care Visual Follow-ups Plan

## Objective

- decompose current Proactive Guardian Care / Position UI problems into issue-sized runs
- improve readability, hierarchy, and route identity without reopening Position architecture work
- keep backend contracts, route behavior, and Position adapter logic untouched

## Visual thesis

- build Position as a calm clinical command desk: dark shell frame, warm porcelain work surfaces, strong black text, and a single map-first focal plane

## Content plan

- route shell and header define the Proactive Guardian Care identity
- left rail handles resident scanning and urgency sorting
- center stage keeps the map as the main operational surface
- right panel acts as the decision and refresh surface
- mobile keeps the same order with the map still leading

## Interaction thesis

- selected resident state should read through one strong surface shift, not extra chrome
- map and rail focus should feel linked through restrained hover/focus motion
- sticky decision context should stay present without visually outweighing the map

## Verified current pain points

- Position route currently inherits shell/header treatment that does not fully match the Proactive Guardian Care workspace tone
- the route has readability complaints from the user, especially around contrast and visual weight
- the layout is structurally correct, but the current surface styling still reads as a collection of cards instead of one coherent operator workspace
- Position already has explicit loading, empty, error, and partial-error states; fixes must preserve those states

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/FlyCarePage.tsx`
- Position map coordinates, selection derivation, zone command derivation, and data sourcing logic

## Target files

- `frontend/src/styles/app-shell.css` only for Position route shell and header selectors
- `frontend/src/styles/position-page.css`
- `frontend/src/pages/PositionPage.tsx` only if a purely visual wrapper becomes necessary
- `frontend/src/components/position/PositionResidentRail.tsx` only if a purely presentational wrapper becomes necessary
- `frontend/src/components/position/PositionMapStage.tsx` only if a purely presentational wrapper becomes necessary
- `frontend/src/components/position/PositionDecisionPanel.tsx` only if a purely presentational wrapper becomes necessary
- `frontend/src/components/position/PositionSummaryBar.tsx` only if a purely presentational wrapper becomes necessary

## Forbidden changes

- no backend changes
- no adapter truth-model changes
- no route changes
- no auth or theme persistence changes
- no map-source swap
- no FlyCare piggyback edits

## Workstream split

### Run 0: Position presentation recovery only

- target: remove dark-mode readability failures on `/position` and wire the eldercare exact SVG into the Position background layer
- target files:
  - `frontend/src/styles/position-page.css`
  - `docs/frontend-position/13-position-presentation-recovery-workstream.md`
- acceptance:
  - resident rail cards, summary tiles, map command strip, and decision controls remain readable in dark mode
  - `frontend/src/assets/brand/texture-eldercare-exact-full.svg` is the active background asset for Position
  - no source reference to the eldercare PNG is introduced
  - light mode remains intact
  - no adapter or route behavior changes
  - no overflow or sticky regressions

### Run A: Position header and shell readability only

- target: make the Proactive Guardian Care route identity readable and intentional in the shared shell
- target files:
  - `frontend/src/styles/app-shell.css`
- acceptance:
  - brand/title/subtitle readability is strong in light and dark mode
  - Position route shell tone feels distinct from FlyCare without fragmenting the shared shell
  - top rail, nav, and first viewport remain stable on desktop and mobile

### Run B: Resident rail and summary hierarchy only

- target: reduce card-wall feeling on the left side and improve urgency scanning
- target files:
  - `frontend/src/styles/position-page.css`
  - `frontend/src/components/position/PositionResidentRail.tsx` only if a visual wrapper is strictly needed
  - `frontend/src/components/position/PositionSummaryBar.tsx` only if a visual wrapper is strictly needed
- acceptance:
  - resident scanning is faster in error and empty states
  - selected resident treatment is stronger without adding extra decorative UI
  - summary block reads as operational context, not as a generic card

### Run C: Map stage emphasis and surface unification only

- target: make the center stage visually dominant and better integrated with the two side columns
- target files:
  - `frontend/src/styles/position-page.css`
  - `frontend/src/components/position/PositionMapStage.tsx` only if a visual wrapper is strictly needed
- acceptance:
  - map remains the strongest element at first glance
  - empty/error overlays and command strip keep high contrast
  - the workspace reads as one operational plane instead of three disconnected boxes

### Run D: Decision panel readability and sticky balance only

- target: improve the right panel's hierarchy, contrast, and sticky behavior
- target files:
  - `frontend/src/styles/position-page.css`
  - `frontend/src/components/position/PositionDecisionPanel.tsx` only if a visual wrapper is strictly needed
- acceptance:
  - refresh action, panel title, and state messaging remain readable in both themes
  - sticky behavior supports the workspace instead of overpowering it
  - empty/error/loading states remain explicit and operator-readable

### Run E: Position closeout only

- target: validate, document, and hand off the Position visual follow-up runs
- target files:
  - `docs/frontend-position/12-position-visual-followups-plan.md`
  - `docs/frontend-position/99-handoff.md` if the meaning of current Position state changes
  - `_ben_mem/CURR.mem`
  - `_ben_mem/LOG/*`

## Validation contract for each run

- `npm run build`
- `npm run lint`
- Playwright smoke on `/position`
- confirm adapter and protected surfaces stayed untouched
- inspect `git diff --name-only`

## Recommended execution order

- Run 0: presentation recovery
- Run A: Position header and shell readability
- Run B: resident rail and summary hierarchy
- Run C: map stage emphasis and surface unification
- Run D: decision panel readability and sticky balance
- Run E: closeout
