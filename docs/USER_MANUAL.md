# Proactive Guardian Care User Manual

This manual covers the core product flows of Proactive Guardian Care (excluding FlyCare).

## 1. Product Overview

Proactive Guardian Care is a smart eldercare operations system that supports:

- Resident status monitoring
- Indoor positioning and location awareness
- Alert/event triage and handling
- Family-facing communication views
- Admin maintenance for users, devices, locations, and events

(Insert image: homepage with top navigation and module entry points)

## 2. Roles and Access

- Caregiver: can use operational pages such as Overview, Residents, Indoor Positioning, Operations, and Family Engagement.
- Admin: can access all pages, including the Admin module.
- Guest: limited visibility depending on demo/runtime configuration.

(Insert image: login page and role selection example)

## 3. Quick Start

1. Log in to the system.
2. Open Overview to check current risk distribution.
3. Open Residents to inspect resident list and vitals entry points.
4. Use Indoor Positioning to confirm current resident locations.
5. Use Operations to process unhandled alerts.
6. Use Family Engagement to prepare communication summaries.

(Insert image: click path from Overview -> Residents -> Position -> Operations)

## 4. Core Modules

## 4.1 Overview

### What it is for

- Shift-level snapshot of status trends and alerts
- Fast decision support before detailed follow-up

### Typical actions

- Review KPI cards and trend charts
- Identify high-priority cases for immediate handling

(Insert image: full Overview page)
(Insert image: chart/cards close-up)

## 4.2 Residents

### What it is for

- Central resident list with room, status, last seen info, and linked device context
- Entry point for vitals detail via View vitals button

### Typical actions

- Search by resident name or room
- Filter by status (stable/followUp/high)
- Open View vitals for detailed vital-sign records

### Notes

- The table-level Vitals column is intentionally hidden; vitals are accessed through View vitals.
- Room and Last seen location are based on backend aggregation and fallback logic.

(Insert image: Residents list page)
(Insert image: filter/search in action)
(Insert image: View vitals modal)

## 4.3 Indoor Positioning

### What it is for

- Real-time resident position tracking on an indoor map
- Decision support from the right-side Information panel

### Typical actions

- Select a resident from the resident rail
- Use View all residents to inspect map-wide distribution
- Click Refresh to update panel data

### Interpretation tips

- Live/Warning tags indicate freshness and attention level.
- If position does not update, verify device upstream and backend connectivity first.

(Insert image: full Indoor Positioning page)
(Insert image: map stage with resident markers)
(Insert image: right-side Information panel)

## 4.4 Operations

### What it is for

- Unified handling of fall/SOS/vital anomaly alerts
- Track event lifecycle (for example unhandled -> confirmed/resolved)

### Typical actions

- Open event queue and inspect details
- Confirm event context (resident, trigger device, location, timestamp)
- Update handling status and add remarks

(Insert image: Operations event list)
(Insert image: event detail and status update area)

## 4.5 Family Engagement

### What it is for

- Family-oriented resident briefing view
- Supports concise and explainable communication snapshots

### Typical actions

- Review primary resident briefing card
- Switch among residents for side-by-side understanding
- Confirm recent status/location changes before communication

(Insert image: Family Engagement page)
(Insert image: resident briefing card close-up)

## 4.6 Admin

### What it is for

- Master data and operations maintenance:
  - Users
  - Devices
  - Locations
  - Events
  - Device Logs
  - Residents aggregate view

### Typical actions

- Maintain user/device binding relationships
- Maintain location-zone definitions and names
- Verify event closure quality and traceability

(Insert image: Admin tabs overview)
(Insert image: Devices management page)
(Insert image: Locations management page)

## 5. Recommended Operational Flows

## 5.1 Alert Handling Flow

1. Detect risk from Overview or Operations.
2. Verify current location in Indoor Positioning.
3. Perform on-site action and update event status in Operations.
4. Prepare communication summary in Family Engagement when needed.

(Insert image: 4-step alert-handling storyboard)

## 5.2 Shift Handover Flow

1. Check Overview risk distribution.
2. Filter followUp/high residents in Residents.
3. Confirm open/unhandled events in Operations.
4. Record pending tasks for next shift.

(Insert image: shift handover checklist screenshot)

## 6. Troubleshooting (Common Cases)

## 6.1 Room shows test-roomXX or Unknown

- Root cause is typically missing or stale location sources.
- Check:
  - Device deployment location configuration
  - Event location writes
  - Mongo/location fallback availability

## 6.2 Last seen location is blank or Unknown

- Often caused by lack of recent location events/upstream location payloads.
- Verify:
  - device upstream data
  - backend residents aggregation endpoint
  - location zone mapping/config

## 6.3 Page appears blank/loading unexpectedly

- Verify frontend and backend are both running.
- Check browser console and backend logs for runtime/API errors.
- Confirm API response shape aligns with frontend data assumptions.

(Insert image: sample error console/log for troubleshooting section)

## 7. Screenshot Checklist Template

Use the checklist below while capturing final manual screenshots:

- [ ] Home + top navigation
- [ ] Login + role selection
- [ ] Overview full page
- [ ] Residents list + filter/search
- [ ] View vitals modal
- [ ] Indoor Positioning full page
- [ ] Map marker close-up
- [ ] Information panel close-up
- [ ] Operations list + event detail
- [ ] Family Engagement full page
- [ ] Admin tabs overview
- [ ] Devices page
- [ ] Locations page
- [ ] Alert handling flow storyboard (4 screenshots)
- [ ] Shift handover reference screenshot

