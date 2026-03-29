# FlyCare Visual Follow-ups Plan

## Objective

- decompose the current FlyCare visual issues into issue-sized runs
- separate brand-lockup fixes from background-asset fixes
- keep FlyCare workflow logic and Position architecture untouched

## Verified current state

- FlyCare route shell uses `frontend/src/assets/brand/texture-airport-exact-full.svg` as the shell background texture
- FlyCare right-panel header badge uses `frontend/src/assets/brand/flycare-badge-exact-crop.svg`
- FlyCare header mark is still the shared SmartCare mark from `frontend/src/assets/brand/smartcare-mark-exact-full.svg`
- FlyCare center map base is `frontend/src/img/FlyCare.png`
- the shell texture and badge are both injected from `frontend/src/styles/app-shell.css`
- `frontend/src/pages/FlyCarePage.tsx` still owns workflow logic, map grid, polling, and drawer behavior

## Verified current measurements

- FlyCare header mark rendered at about `56.7 x 32.04 px`
- FlyCare shell texture rendered from `texture-airport-exact-full.svg` at opacity `0.11`
- FlyCare shell texture background size is currently `min(1180px, 92%)`
- FlyCare right-panel badge rendered at about `57.59 x 35.09 px`
- FlyCare shell width stayed `1440 px` in desktop smoke checks

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/pages/FlyCarePage.tsx` workflow logic
- polling behavior
- zone logic
- flight drawer behavior
- device mapping behavior
- map image source unless a task explicitly says otherwise

## Workstream split

### Run A: FlyCare header brand lockup only

- target: fix the FlyCare route brand lockup, including mark sizing, copy rhythm, and route-specific header tone
- target files:
  - `frontend/src/components/shell/AppHeader.tsx`
  - `frontend/src/styles/app-shell.css`
- forbidden:
  - no FlyCare workflow edits
  - no overview/header changes outside FlyCare-specific selectors unless required for shared safety
- acceptance:
  - FlyCare header brand lockup reads intentionally and does not look borrowed from overview
  - desktop and mobile header alignment stays stable

### Run B: FlyCare shell background asset and layout only

- target: resolve the background insertion problem as a separate issue
- focus:
  - confirm whether the airport shell layer should stay SVG
  - if SVG stays, correct its scale, anchor, and opacity
  - if SVG is too heavy or visually unstable, justify a controlled fallback
- target files:
  - `frontend/src/styles/app-shell.css`
  - `frontend/src/assets/brand/texture-airport-exact-full.svg` only if the asset itself must be replaced
- forbidden:
  - no map-base changes
  - no panel content changes
- acceptance:
  - background layer has predictable desktop/mobile placement
  - no shell crowding behind the map and side panels
  - asset choice is explicit: exact SVG or justified fallback

### Run C: FlyCare map-stage framing only

- target: improve the visual framing around the center map without changing the map image source or grid behavior
- target files:
  - `frontend/src/styles/app-shell.css`
  - `frontend/src/styles/global.css` only if an existing FlyCare-compatible selector must be adjusted
- forbidden:
  - no changes to map coordinates, target dot logic, or grid interactivity
- acceptance:
  - map-first hierarchy is stronger
  - side columns and map stage feel like one operational workspace

### Run D: FlyCare info panel hierarchy only

- target: fix the right-panel visual hierarchy, including badge use, header balance, and block rhythm
- target files:
  - `frontend/src/styles/app-shell.css`
  - `frontend/src/pages/FlyCarePage.tsx` only if a purely visual wrapper is strictly required
- forbidden:
  - no data-flow changes
  - no drawer logic changes
- acceptance:
  - info panel header looks intentional
  - badge presence does not distort header layout
  - content blocks scan clearly

### Run E: FlyCare layout recovery only

- target: recover the workspace after the drawer regression pushed hidden UI back into normal layout flow
- target files:
  - `frontend/src/styles/global.css`
  - `docs/frontend-redesign/12-flycare-layout-recovery-workstream.md`
- forbidden:
  - no workflow logic changes
  - no map-source changes
- acceptance:
  - hidden drawer no longer stretches the page
  - empty/error side rails no longer occupy false full-height columns
  - mobile drawer returns to overlay presentation

### Run F: FlyCare header readability only

- target: correct the FlyCare header lockup readability after the dark rail typography regressed
- target files:
  - `frontend/src/styles/app-shell.css`
  - `docs/frontend-redesign/13-flycare-header-readability-workstream.md`
- forbidden:
  - no FlyCare workflow edits
  - no route or auth changes
- acceptance:
  - title remains clearly readable on the dark fixed rail
  - subtitle stays secondary but legible
  - mobile and desktop header scale remain stable

### Run G: FlyCare closeout only

- target: validate, document, and hand off the FlyCare visual follow-up runs
- target files:
  - `docs/frontend-redesign/06-flycare-visual-followups-plan.md`
  - `docs/frontend-redesign/99-flycare-handoff.md`
  - `_ben_mem/CURR.mem`
  - `_ben_mem/LOG/*`

## Validation contract for each run

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare`
- confirm `frontend/src/pages/FlyCarePage.tsx` workflow logic stayed untouched unless that run explicitly allowed a visual wrapper
- `git diff --name-only`

## Recommended execution order

- Run A: header brand lockup
- Run B: shell background asset and layout
- Run C: map-stage framing
- Run D: info panel hierarchy
- Run E: layout recovery
- Run F: header readability
- Run G: closeout
