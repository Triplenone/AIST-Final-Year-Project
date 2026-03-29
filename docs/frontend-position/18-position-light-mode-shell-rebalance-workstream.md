# Position Light-Mode Shell Rebalance

## Objective

- reduce the excessive dark chrome on `/position` in normal mode
- keep the Proactive Guardian Care route identity, but move it back to a porcelain clinical workspace instead of a dark rail
- keep dark mode, Position runtime logic, adapter derivation, backend contracts, and routes untouched

## Target files

- `frontend/src/styles/app-shell.css`

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/FlyCarePage.tsx`

## Problem statement

- the Position light-mode route shell still used a dark header, dark nav shell, and dark outer stage frame
- the inner Position panels were already light, so the page read like light cards dropped into a dark-mode shell
- the user requirement for this run was explicit: normal mode should not look like dark mode

## Change summary

- changed the Position route header from a dark rail to a warm light gradient with lower shadow weight
- changed the Position brand lockup container to a light framed treatment so the logo/title remain clear without a dark slab
- changed the Position route nav shell to a brighter translucent porcelain treatment while keeping the active pill warm and distinct
- changed the Position outer stage frame from dark graphite to a lighter stone frame, preserving the route-specific accent wash
- left dark-mode overrides in place so only light-mode Position chrome was rebalanced

## Acceptance

- `/position` light mode no longer presents a dark shell/header/frame as the dominant tone
- the Proactive Guardian Care route still reads as a distinct workspace
- dark mode remains readable and visually stable
- no Position logic, data source, route, or backend contract changes are introduced

## Validation

- `npm run build`
- `npm run lint`
- Playwright checks on `/position` in light mode, dark mode, and mobile
- inspect computed header/nav/stage styles to confirm the light-mode chrome is no longer dark

## Outcome

- light-mode Position shell chrome now matches the light clinical surfaces already used by the page body
- exact SVG background usage remains unchanged at `frontend/src/assets/brand/texture-eldercare-exact-full.svg`
- PNG fallback remains unused in source
