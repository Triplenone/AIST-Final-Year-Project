# Frontend-Only Optimization Queue

## Objective

- define the next frontend-only optimization runs on `ben/frontend-only-improve`
- keep each future run issue-sized, acceptance-driven, and file-scoped
- avoid reopening completed Position or FlyCare bundles as broad redesign epics

## This document is not

- not a new multi-phase program
- not permission to batch unrelated frontend work into one PR
- not permission to touch backend, route contracts, auth persistence, or theme persistence

## Current verified starting point

- shared shell foundation is active
- Position visual follow-ups are closed
- FlyCare visual follow-ups are closed
- brand asset intake and route branding are already integrated
- exact SVG brand backgrounds are active for Position and FlyCare
- local runtime still shows React Router future warnings and upstream `status_update` 404s

## Visual thesis

- keep AIST as one calm care operations shell with route-specific identity: Overview is brand-led, Position is warm clinical, FlyCare is dark transit ops, and utility routes stay restrained and operator-first

## Content plan

- shell and route framing first
- utility workspaces second
- performance and accessibility third
- ready-state validation and handoff last

## Interaction thesis

- one stable nav/header behavior across all routes
- one restrained motion language for route entry, hover, and drawer/dock presence
- explicit empty/loading/error messaging that remains readable in both themes

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/FlyCarePage.tsx` core workflow

## Workstream queue

### Run 1: Shared shell resilience only

- status: completed, see `docs/frontend-redesign/21-shared-shell-resilience-workstream.md`

- objective: harden the shared shell against long labels, zoom, desktop clipping, and route-to-route spacing drift
- target files:
  - `frontend/src/components/shell/AppHeader.tsx`
  - `frontend/src/components/shell/QuickActionsDock.tsx`
  - `frontend/src/styles/app-shell.css`
- forbidden:
  - no route changes
  - no auth/theme persistence changes
  - no FlyCare workflow edits
- acceptance:
  - nav remains visible at common desktop widths and 125 percent zoom
  - quick actions never cover critical route actions on desktop or mobile
  - header spacing and height remain stable across overview, position, flycare, and admin
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright `/`, `/position`, `/flycare`, `/admin`

### Run 2: Overview narrative tightening only

- status: completed, see `docs/frontend-redesign/22-overview-narrative-tightening-workstream.md`

- objective: make Overview read as the canonical brand-led front door instead of a dashboard collage
- target files:
  - `frontend/src/components/overview/OverviewExperience.tsx`
  - `frontend/src/styles/overview.css`
- forbidden:
  - no Position or FlyCare edits
  - no backend-facing copy promises
- acceptance:
  - first viewport keeps one dominant visual idea
  - copy is reduced and scannable
  - hero, support, detail, and CTA each have one clear job
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright `/` light, dark, and mobile

### Run 3: Residents workspace utility pass only

- status: completed, see `docs/frontend-redesign/23-residents-workspace-utility-workstream.md`

- objective: make `/residents` feel like an operator workspace instead of a generic admin card wall
- target files:
  - `frontend/src/components/admin/ResidentsAdmin.tsx`
  - route-scoped admin styling only
- forbidden:
  - no CRUD behavior changes
  - no route changes
  - no backend payload changes
- acceptance:
  - table/list scanning is faster
  - filters, status, and resident actions are visually prioritized
  - empty and error states remain explicit
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright `/residents`

### Run 4: Location workspace emphasis only

- objective: make `/location` read as a map-first operational surface rather than a leftover utility page
- target files:
  - `frontend/src/components/LocationDashboard.tsx`
  - route-scoped location styling
- forbidden:
  - no map source swap
  - no backend contract changes
- acceptance:
  - map is the first visual priority
  - side context supports the map instead of competing with it
  - mobile keeps map-first order
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright `/location`

### Run 5: Operations and Family consistency only

- objective: bring `/operations` and `/family` to the same utility quality bar as the improved shell and route surfaces
- target files:
  - `frontend/src/App.tsx` only where these routes are composed
  - route-surface styling in shared shell files only if needed
- forbidden:
  - no new route creation
  - no backend/event logic changes
- acceptance:
  - both routes feel intentional, not placeholder surfaces
  - copy becomes utility-first and less generic
  - visual hierarchy matches the shell language
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright `/operations` and `/family`

### Run 6: Admin information architecture only

- objective: tighten `/admin` information hierarchy and reduce internal card sprawl without changing admin workflows
- target files:
  - `frontend/src/components/admin/AdminSection.tsx`
  - `frontend/src/components/admin/*.tsx` only where layout wrappers are needed
- forbidden:
  - no role logic changes
  - no auth/session changes
- acceptance:
  - tabs and section priorities are clearer
  - operational content outweighs decorative chrome
  - empty and loading states remain explicit
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright `/admin`

### Run 7: Performance and asset hygiene only

- objective: reduce frontend delivery weight without changing product behavior
- target files:
  - `frontend/package.json`
  - frontend build config if needed
  - oversized brand asset usage sites only if imports can be improved safely
- forbidden:
  - no visual redesign piggyback
  - no backend changes
- acceptance:
  - chunk-size warning is reduced or intentionally documented
  - exact SVG usage remains correct where required
  - no Windows absolute paths appear in source
- validation:
  - `npm run build`
  - inspect bundle output and asset references

### Run 8: Accessibility and responsive hardening only

- objective: close keyboard, contrast, reduced-motion, and narrow-width gaps across the frontend shell and key routes
- target files:
  - `frontend/src/styles/app-shell.css`
  - route-scoped CSS files only where needed
  - component files only if semantic fixes are required
- forbidden:
  - no backend or route changes
  - no broad visual restyling hidden as accessibility work
- acceptance:
  - keyboard focus is visible and logical
  - 320 to 393 px widths avoid page overflow
  - dark/light contrast remains readable
  - reduced-motion behavior remains safe
- validation:
  - `npm run build`
  - `npm run lint`
  - Playwright mobile and keyboard smoke across `/`, `/position`, `/flycare`, `/residents`

## Blocked or dependency-tied work

- full ready-state validation for Position and FlyCare is still blocked by upstream `status_update` and `mongo-upstream` runtime failures
- backend recovery must stay in a separate workstream

## Recommended execution order

1. Run 1: shared shell resilience
2. Run 2: overview narrative tightening
3. Run 3: residents workspace utility pass
4. Run 4: location workspace emphasis
5. Run 5: operations and family consistency
6. Run 6: admin information architecture
7. Run 7: performance and asset hygiene
8. Run 8: accessibility and responsive hardening

## Run template rule

Every future run from this queue must include:

- objective
- target branch
- protected surfaces
- target files
- forbidden changes
- acceptance criteria
- validation commands
- expected final report format

## Closeout rule

- do not mark the frontend as complete after this planning doc alone
- only close this queue when the selected runs are individually completed, validated, documented, and recorded in `_ben_mem`
