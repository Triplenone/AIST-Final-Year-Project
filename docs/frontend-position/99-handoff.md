# Position Visual Follow-up Handoff

## Purpose

This handoff is the repo-level closeout for the Proactive Guardian Care visual follow-up runs on `/position`.

It is meant for:
- future Codex runs
- frontend maintainers
- reviewers who were not present in the original chat

## Current status

Position visual follow-ups are closed on branch `ben/frontend-only-improve`.

Completed runs:
- Run 0: presentation recovery
- Run A: header and shell readability
- Run B: resident rail and summary hierarchy
- Run C: map stage emphasis and surface unification
- Run D: decision panel readability and sticky balance
- Run E: closeout

The route now reads as a calm clinical command desk:
- dark shell and route identity are readable
- left rail scans faster and selected resident context is clearer
- center map stage is the primary focal plane
- right decision panel behaves like a briefing column instead of another generic card block

## Current implementation boundaries

Locked file ownership:
- page orchestration: `frontend/src/pages/PositionPage.tsx`
- adapter truth model: `frontend/src/adapters/position-command-center.ts`
- Position styling: `frontend/src/styles/position-page.css`

Still protected:
- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/pages/FlyCarePage.tsx`

Rules that still apply:
- keep Position derivation in the adapter
- keep Position-specific visual growth out of `global.css`
- keep map-first layout priority on wide, medium, and narrow breakpoints
- keep explicit loading, empty, error, and partial-error states

## Active assets and visual rules

Active Position background asset:
- `frontend/src/assets/brand/texture-eldercare-exact-full.svg`

Asset rule:
- SVG is the active source
- PNG fallback was not used in source
- `frontend/src/assets/brand/texture-eldercare.png` remains backup-only

Current layout rule:
- wide: `left -> center -> panel`
- medium: map-first with panel paired on the right
- narrow: stacked `center -> left -> panel`

Current UI rule:
- map stage remains the strongest visual surface
- resident rail stays readable and urgency-led
- decision panel supports the map and must not overpower it

## Validation reality

Validated during the visual follow-up sequence:
- `npm run build`
- `npm run lint`
- Playwright smoke on `/position` in light, dark, and mobile

Verified outcomes:
- no horizontal overflow detected on `/position`
- shell/header readability is stable in both themes
- exact SVG eldercare background is active
- resident rail, map stage, and decision panel all stay readable in dark mode

Still not fully validated:
- full ready-state operator content driven by upstream activity and status data

Current runtime limitation:
- local `status_update` upstream requests still return 404s in the current repo/runtime state
- React Router future-flag warnings are still present

Do not describe Position as fully live-data-validated until the upstream data path is healthy.

## Safe next work

Safe next steps:
- a new issue-sized Position workstream with explicit scope
- backend or upstream data fixes in their own bounded workstream
- ready-state validation after upstream data becomes available

Unsafe next steps:
- mixing FlyCare changes into Position follow-up work
- moving adapter logic into component render paths
- broad shell cleanup hidden inside a Position PR
- backend contract changes disguised as visual work

## Start point for future maintainers

If a future maintainer needs current Position state, read in this order:
1. `_ben_mem/CURR.mem`
2. `docs/frontend-position/12-position-visual-followups-plan.md`
3. this file
4. `frontend/src/styles/position-page.css`
5. `frontend/src/adapters/position-command-center.ts`
