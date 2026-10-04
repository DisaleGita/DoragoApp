# Dorago manual test plan

Derived from *Dorago Enterprise PRD v1.0* (sections 5, 6, 10, 19 and the
Enterprise Acceptance Criteria). Run the tests in order: later tests reuse data
from earlier ones. Coverage scores are in `PRD_COVERAGE.md`.

## Setup

| Item | Value |
| --- | --- |
| App | http://localhost:8080 (hard-refresh with Cmd+Shift+R after each rebuild) |
| Seeded account | `demo@example.com` — five trips covering all 21 plan types |
| Development code | the `DEV_OTP_CODE` the local API was started with |
| Test files | `~/Downloads/dorago-test-documents/` (`valid/`, `should-be-rejected/`) |
| Second user | use any new email in a private window |

Record each result as **Pass**, **Fail** (with screenshot and DevTools console
errors), or **Blocked** (needs configuration that is not available).

---

## 1. Sign-in (FR-AUTH-001, FR-AUTH-002, PRD §5 "First-time login")

| ID | Steps | Expected |
| --- | --- | --- |
| TC-01 | Open the app | Email field, Continue, Terms/Privacy text. No password field, no Google/Apple/other sign-in buttons |
| TC-02 | Enter `not-an-email`, Continue | Validation error; no code is sent |
| TC-03 | Enter a new email, Continue | "Check your email" screen with a resend countdown |
| TC-04 | Enter a wrong 6-digit code | Invalid-code error; still on the code screen |
| TC-05 | Enter the right code | New account goes to onboarding (TC-08); existing account goes to Trips |
| TC-06 | On the code screen, request another code before the countdown ends | Told to wait; no new code |
| TC-07 | With a fresh email, enter 5 wrong codes, then the right one | Locked after 5 failures; the right code is refused until a new code is requested |
| TC-07b | Wait more than 10 minutes after requesting a code, then enter it | Code expired; must request a new one |
| TC-07c | Request codes for one email 6 times within 15 minutes (wait out the 30 s countdown each time) | "Too many authentication attempts" |

## 2. Onboarding and profile (FR-AUTH-004, FR-AUTH-006)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-08 | New account: onboarding screen | Home timezone pre-filled with the device timezone (not UTC) |
| TC-09 | Type "zzz" as timezone, save | Rejected: choose from the list |
| TC-10 | Type "chic", pick America/Chicago, enter a name, save | Lands on an empty Trips screen |
| TC-11 | Profile → Traveler profile → edit home airport and currency, save | Values shown on Profile |
| TC-12 | Profile → 24-hour time toggle | Timeline times switch between 12-hour and 24-hour |

## 3. Sessions (FR-AUTH-003, §10 Authentication)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-13 | Signed in, refresh the page | Still signed in |
| TC-14 | Open a trip, copy its URL, refresh | Same trip page reopens |
| TC-15 | Profile → Log out, then press Back | Login screen; protected pages not shown |
| TC-16 | After logout, paste a trip URL | Redirected to login |

## 4. Trips (FR-TRIP-001, -002, -005, -007; PRD §5 "Create a trip manually")

| ID | Steps | Expected |
| --- | --- | --- |
| TC-17 | New trip: Trip name + destination only | Timezone defaults to the device timezone; dates default to today + 3 days |
| TC-18 | Open Ends date picker | Dates before the start date are greyed out |
| TC-19 | Move Starts past Ends | Ends moves to match Starts |
| TC-20 | Type "lisb" in timezone, pick Europe/Lisbon, save | Trip appears in the list |
| TC-21 | Edit the trip title | Title updates; purpose is unchanged |
| TC-22 | Search "kyo" | Only matching trips shown |
| TC-23 | Upcoming / Current / Past / Archived filters (demo account) | London under Past; New York under Current; Tokyo under Upcoming |
| TC-24 | Archive a trip, then open Archived | Trip moves to Archived; Unarchive restores it |
| TC-25 | Delete a trip | Trip disappears and does not return after refresh |
| TC-26 | Time the flow: new trip + first plan on a phone-sized window | Under 90 seconds (PRD success metric) |

## 5. Plans and timeline (FR-PLAN-001 – 008, FR-TRIP-002, FR-TRIP-006)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-27 | Open Tokyo & Kyoto → Add Plan | Start timezone defaults to Asia/Tokyo; start date is the trip's first day |
| TC-28 | Open the plan-type list | All 21 types listed |
| TC-29 | Add a flight with airline, flight number, airports, seat, confirmation | Card shows type, time with timezone, and confirmation |
| TC-30 | Add plans in random order | Timeline sorts by real time and groups by day |
| TC-31 | Westbound flight: start 17:30 Asia/Tokyo, end 10:45 America/Los_Angeles same day | Saved (it is in order in UTC) |
| TC-32 | End 1 hour before start, same timezone | "The end time is before the start time"; not saved |
| TC-33 | Plan with cost 120.50 USD | Timeline still loads; trip total includes it |
| TC-34 | Edit a plan's title and time | Card updates and re-sorts |
| TC-35 | Duplicate a plan (⋯ menu) | Copy appears |
| TC-36 | Delete a plan | Removed; trip plan count drops |
| TC-37 | Tap a confirmation number | Copied to clipboard |
| TC-38 | Hotel spanning 4 nights in Tokyo | Check-in on the right day, shown in Asia/Tokyo time |
| TC-39 | Trip list Next Up card (demo account) | Shows the next upcoming plan with a countdown; tap opens its trip |

## 6. Documents (FR-DOC-001, -003, §10 Abuse prevention)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-40 | Docs tab → upload a PDF, a PNG, a JPG and a WebP from `valid/` | Each appears; count increases |
| TC-41 | Open/download an uploaded document | File opens and matches the original |
| TC-42 | Upload `notes.txt` | Rejected: type not allowed |
| TC-43 | Upload `fake_boarding_pass.pdf` | Rejected: content does not match type |
| TC-44 | Upload `too_large_16MB.pdf` | Rejected: too large |
| TC-45 | Upload the same file twice | Second is refused: "already attached to this trip" |
| TC-46 | Upload a renamed copy (Finder Cmd+D) | Refused as a duplicate |
| TC-47 | Same file to a different trip | Allowed |
| TC-48 | Delete a document, upload it again | Allowed |

## 7. Privacy between accounts (§10 Authorization, Acceptance Criteria)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-49 | Private window, sign in as a second email | Empty trip list |
| TC-50 | Paste a demo-account trip URL into the second account | Not found; no demo data shown |
| TC-51 | Second account: Docs of its own trip | Only its own documents |

## 8. Offline (FR-DOC-005, PRD §16, success metric "Offline readiness")

| ID | Steps | Expected |
| --- | --- | --- |
| TC-52 | Load trips, DevTools → Network → Offline, reload | Cached trips, plans, confirmation numbers and notes still visible |
| TC-53 | Offline: edit a plan's notes | Queued banner; nothing claims it synced |
| TC-54 | Back online, Retry | Banner clears; change visible from another browser |
| TC-55 | Offline: "Last synced" time | Shows the last successful sync |

## 9. AI import (FR-IMP-004, -005, -007, PRD §9 Safety)

Blocked until `GEMINI_API_KEY` is configured, except TC-56.

| ID | Steps | Expected |
| --- | --- | --- |
| TC-56 | Without a key: Import → paste text → Parse | Clear "AI import is unavailable" message; no itinerary invented |
| TC-57 | Paste the hotel confirmation text | Proposal with fields and confidence shown for review before saving |
| TC-58 | Paste "Boat tour in Lisbon on Saturday morning" | Date, time, price and confirmation left empty, not guessed |
| TC-59 | Correct a field in review, accept into a trip | Plan saved with the corrected value |
| TC-60 | Upload `Tokyo_PC118_eticket.pdf` to Import | Flight proposal with SFO → HND, PC 118, QX7P2L |

## 10. Account data (FR-AUTH-004, §10 Data export/delete)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-61 | Profile → Export my data | JSON downloads with trips and plans |
| TC-62 | Throwaway account → Delete account → sign in again with that email | New, empty account |

## 11. Responsiveness and accessibility (§10 Non-functional: Accessibility)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-63 | DevTools device toolbar, iPhone size | Navigation moves to the bottom; no horizontal scrolling |
| TC-64 | Keyboard only: Tab through login and trip forms | Every control reachable; visible focus |
| TC-65 | Timeline with 20+ plans opens | Under 2 seconds (PRD performance target) |

---

## Not testable yet (feature not built)

These PRD requirements have no implementation to test. They are tracked in
`PRD_COVERAGE.md`.

- Secondary emails, device list, session revoke, notification preferences, protected vault (FR-AUTH-003/004/005/007)
- Trip merge/split, unfiled items, tags, privacy (FR-TRIP-001/003/004)
- Forwarded email import, inbox sync (FR-IMP-001/002)
- Document vault, scanning, document limits by tier, offline files (FR-DOC-002 – 006)
- All flight intelligence (FR-FLT-001 – 008)
- Plotted maps, routes, nearby places, airport maps, safety scores (FR-MAP-001, -003 – 007)
- Sharing, permissions, share links (FR-SHARE-001 – 005)
- iCal feed, calendar sync, PDF/ICS/CSV export (FR-CAL-001 – 003)
- Travel guidance, risk alerts, stats, carbon, rewards (FR-INTEL-001 – 005, -007)
- Push/SMS/in-app notifications, rules engine (FR-NOTIF-001 – 004)
- Billing, subscriptions, admin and support consoles (FR-BILL, FR-ADM)
