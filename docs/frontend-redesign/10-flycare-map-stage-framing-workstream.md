# FlyCare Map Stage Framing Workstream

## Objective

- strengthen the FlyCare map-first hierarchy without changing the map image source or grid behavior
- make the side rails and center stage read as one operational surface instead of three disconnected boxes

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- dark airport operations desk: the map stays brightest and most anchored, while the side rails recede into calmer translucent surfaces

## Content plan

- left rail: roster support surface
- center stage: dominant map canvas with a deliberate frame
- right rail: quieter operator context surface

## Interaction thesis

- no new motion; improve presence through framing, depth, and contrast only
- keep the map as the first readable object in the workspace

## Target files

- `frontend/src/styles/global.css`
- `docs/frontend-redesign/10-flycare-map-stage-framing-workstream.md`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx`
- map image source
- grid coordinates
- target dot logic
- panel data flow
- polling behavior
- drawer behavior
- backend files and payload contracts

## Forbidden changes

- no `FlyCarePage.tsx` workflow edits
- no map asset replacement
- no change to grid click behavior
- no info-panel content reorder in this run

## Acceptance

- center map stage reads as the dominant workspace plane
- left and right rails visually belong to the same FlyCare workspace
- map framing improves without changing the map image source or interaction model

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare`
- inspect `git diff --name-only`
