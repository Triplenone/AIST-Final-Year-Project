# Overview Narrative Tightening Workstream

## Objective

- make `/` read as the canonical brand-led front door
- reduce the dashboard-collage feel in the first impression
- keep one dominant hero, one support strip, one detail zone, and one final roadmap CTA

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/FlyCarePage.tsx` core workflow

## Target files

- `frontend/src/components/overview/OverviewExperience.tsx`
- `frontend/src/styles/overview.css`

## Changes

- kept the existing brand hero but tightened it into a poster-like first viewport
- changed the live signal stack inside the hero visual from a vertical pile to a restrained 3-column strip
- pulled the metrics into one shared support surface with a short intro instead of letting them read like another dashboard row
- reduced the lower layout from four equal panels to one main detail zone plus a final roadmap CTA block
- turned the support metrics into a horizontal mobile pulse strip to avoid excessive stacked height

## Acceptance result

- first viewport now keeps one dominant visual idea
- copy is shorter and more scannable in the hero and follow-up sections
- support, detail, and final CTA each have a distinct job
- light, dark, and mobile overview layouts remain readable without page overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/` light desktop
- Playwright `/` dark desktop
- Playwright `/` mobile light

## Blockers kept out of scope

- React Router future warnings remain unchanged
- Recharts width/height warnings remain unchanged on overview charts
- no Position, FlyCare, backend, route, auth, or theme persistence code changes
