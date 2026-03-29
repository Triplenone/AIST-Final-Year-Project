# Location Workspace Emphasis Workstream

## Objective

- make `/location` read as a map-first operational workspace instead of a leftover utility panel
- keep the indoor map as the dominant visual plane while turning legend and occupancy into support context
- preserve map source, Leaflet behavior, and backend contracts

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

- `frontend/src/components/LocationDashboard.tsx`
- `frontend/src/styles/location-map.css`

## Changes

- rebuilt the location header into a route-level workspace intro with sync status and refresh action
- added a summary strip so active residents, mapped markers, occupied zones, and freshness are readable before the map
- turned the left side into a dedicated map stage with a stronger floorplan frame and a quick zone-count strip under the map
- reduced the right side into a briefing rail for legend and occupancy, instead of letting it compete with the map
- kept all data derivation, map source, and marker logic intact while only changing presentation

## Acceptance result

- the map is now the first visual priority on desktop and mobile
- side context supports the map instead of competing with it
- mobile keeps a map-first stack with the panel pushed below the stage
- light and dark themes remain readable without page overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/location` light desktop
- Playwright `/location` dark desktop
- Playwright `/location` mobile light
- Playwright `/` shared shell smoke

## Blockers kept out of scope

- React Router future warnings remain unchanged
- no map source swap, no backend contract changes, no route changes, and no auth/theme persistence changes
- no changes to resident data derivation beyond presentation ordering
