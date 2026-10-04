# Dorago PRD coverage

Assessed 2026-10-03 against *Dorago Enterprise PRD v1.0* (June 12, 2026), section 6
(functional requirements). Each requirement was checked against the code in
`services/api` and `apps/flutter`, not against plans or docs.

## Scoring

| Score | Meaning |
| --- | --- |
| 1 | Done: the requirement's behaviour exists end to end (API + UI) |
| 0.75 | Mostly: core behaviour exists; named sub-features are missing |
| 0.5 | Partial: a meaningful slice exists |
| 0.25 | Started: groundwork only (schema, a link, a stub) |
| 0 | Not built |

"Implemented" is not the same as "verified": Gemini parsing, SMTP delivery and
real object storage have not been exercised against live providers (see
`IMPLEMENTATION_STATUS.md`).

## Summary

| PRD area | Reqs | Score | Coverage |
| --- | ---: | ---: | ---: |
| 6.1 Account, OTP, sessions, profile | 7 | 2.5 | 36% |
| 6.2 Trip creation and management | 7 | 3.25 | 46% |
| 6.3 Plan types and details | 8 | 6.5 | 81% |
| 6.4 Import and parsing | 8 | 3.75 | 47% |
| 6.5 Documents and vault | 6 | 1.5 | 25% |
| 6.6 Flight intelligence | 8 | 0 | 0% |
| 6.7 Maps, places, safety | 7 | 0.75 | 11% |
| 6.8 Sharing and collaboration | 5 | 0.25 | 5% |
| 6.9 Calendar, exports, integrations | 4 | 0.5 | 13% |
| 6.10 Guidance, stats, rewards, carbon, costs | 7 | 0.5 | 7% |
| 6.11 Notifications | 4 | 0.5 | 13% |
| 6.12 Billing and entitlements | 3 | 0 | 0% |
| 6.13 Admin, support, business | 4 | 0 | 0% |
| **Total** | **78** | **20** | **26%** |

Core itinerary (6.1–6.3): 12.25 / 22 = **56%**.

## Requirement detail

### 6.1 Account, OTP, sessions, profile — 2.5 / 7

| ID | Score | Built | Missing |
| --- | ---: | --- | --- |
| FR-AUTH-001 | 1 | Email OTP only; success verifies email; no password/social UI | — |
| FR-AUTH-002 | 0.5 | 10-min expiry, single use, 5-attempt lock, 30 s resend, Redis limits per email/IP | Device-fingerprint and risk-score limits |
| FR-AUTH-003 | 0.5 | Access + rotating refresh tokens, reuse revocation, logout | Device list, revoke one session, remember device, suspicious-login alerts |
| FR-AUTH-004 | 0.5 | Account on first OTP, profile edit, JSON export, delete | Secondary emails, deactivate |
| FR-AUTH-005 | 0 | — | Notification preferences |
| FR-AUTH-006 | 0.5 | Name, home airport, timezone, currency | Birthdate, nationality, emergency contacts, known-traveler and reward numbers |
| FR-AUTH-007 | 0 | — | PIN/biometric/step-up unlock, field-level encryption |

### 6.2 Trips — 3.25 / 7

| ID | Score | Built | Missing |
| --- | ---: | --- | --- |
| FR-TRIP-001 | 0.75 | Create/edit/delete/archive; title, destination, dates, timezone, purpose, notes, travelers (API) | Privacy, cover image upload, tags |
| FR-TRIP-002 | 0.75 | Chronological timeline grouped by day; Next Up card | Timeline filters, search, collapse |
| FR-TRIP-003 | 0 | — | Merge/split, merge suggestions |
| FR-TRIP-004 | 0 | — | Unfiled items |
| FR-TRIP-005 | 0.5 | Per-plan timezones; additional destinations in API | Multi-destination editing in UI, itinerary legs |
| FR-TRIP-006 | 0.5 | Per-plan cost; trip totals by currency | Categories, per-traveler split |
| FR-TRIP-007 | 0.75 | Upcoming/current/past/archived views | Canceled and deleted views, stats |

### 6.3 Plan types — 6.5 / 8

| ID | Score | Built | Missing |
| --- | ---: | --- | --- |
| FR-PLAN-001 | 1 | All 21 types | — |
| FR-PLAN-002 | 0.75 | Common fields, local + UTC times, versions, reminders | Plan-level documents and traveler assignment in UI |
| FR-PLAN-003 | 0.75 | Airline, number, airports, terminals, gates, seat, cabin, aircraft, baggage | Live status, check-in URL |
| FR-PLAN-004 | 0.75 | Property, room, guests, cancellation, deposit | Loyalty number, amenities |
| FR-PLAN-005 | 1 | Company, pick-up/drop-off, class, membership, insurance, fuel, driver | — |
| FR-PLAN-006 | 0.75 | Carrier, stations, route, platform, train no., coach, seat, ticket, stops | Vessel name, boarding time, baggage rules |
| FR-PLAN-007 | 0.75 | Venue, party size, organizer, dress code, cancellation, tickets | QR code |
| FR-PLAN-008 | 0.75 | User edits stored as protected overrides with provenance | "Accept newer source update" flow |

### 6.4 Import and parsing — 3.75 / 8

| ID | Score | Built | Missing |
| --- | ---: | --- | --- |
| FR-IMP-001 | 0 | — | Inbound email address |
| FR-IMP-002 | 0 | — | Inbox sync |
| FR-IMP-003 | 0.75 | Type-specific manual forms, timezone search, trip defaults | Smart lookup (e.g. flight number) |
| FR-IMP-004 | 0.5 | PDF/image upload parsed by Gemini, review before save | OCR pipeline, calendar/email files; not verified live |
| FR-IMP-005 | 0.75 | Paste text → structured proposal → review | Not verified live |
| FR-IMP-006 | 0.5 | Import review flags proposals matching an existing plan; duplicate document detection; idempotent sync | Email message-ID, fuzzy and cross-trip deduplication |
| FR-IMP-007 | 0.75 | Per-field confidence and provenance, override status | Source spans in UI |
| FR-IMP-008 | 0.5 | Friendly failures, parser runs stored | Retry, diagnostics view |

### 6.5 Documents — 1.5 / 6

| ID | Score | Built | Missing |
| --- | ---: | --- | --- |
| FR-DOC-001 | 0.75 | Trip documents, private storage, type/content/size checks, duplicate check | Attach to a plan and pick category in UI |
| FR-DOC-002 | 0 | — | Travel document vault |
| FR-DOC-003 | 0.25 | 15 MB per-file limit | Per-trip count limits by tier |
| FR-DOC-004 | 0 | — | Camera scan, MRZ/QR |
| FR-DOC-005 | 0.25 | Document metadata cached offline | Files available offline |
| FR-DOC-006 | 0.25 | Documents private to owner | Selective sharing (sharing not built) |

### 6.6 Flight intelligence — 0 / 8

FR-FLT-001 to FR-FLT-008 (status, alerts, alternates, seats, fares,
compensation, leave-now, security waits) are not built.

### 6.7 Maps — 0.75 / 7

| ID | Score | Built | Missing |
| --- | ---: | --- | --- |
| FR-MAP-001 | 0.25 | Map / Places tab listing locations | Plotted map |
| FR-MAP-002 | 0.5 | Opens Google Maps search per location | Plan-to-plan directions |
| FR-MAP-003 – 007 | 0 | — | Transport options, nearby, airport maps, safety scores, risk thresholds |

### 6.8 Sharing — 0.25 / 5

FR-SHARE-001 scores 0.25 (copy itinerary summary to clipboard). Invites,
permissions, recipient updates, links and coordination are not built.

### 6.9 Calendar and exports — 0.5 / 4

FR-CAL-003 0.25 (account JSON export, copied summary); FR-CAL-004 0.25 (Gemini
and SMTP adapters). iCal feed and calendar sync are not built.

### 6.10 Guidance, stats, rewards — 0.5 / 7

FR-INTEL-006 0.5 (plan costs and trip totals). Guidance, risk alerts, stats,
carbon, rewards and ratings are not built.

### 6.11 Notifications — 0.5 / 4

FR-NOTIF-001 0.25 (OTP email; local mobile reminders); FR-NOTIF-003 0.25 (plan
reminders). Rules engine and alert sharing are not built.

### 6.12 Billing and 6.13 Admin — 0 / 7

Not built.

## Differences from the PRD worth recording

- The PRD API uses `/v1/auth/token/refresh` and `/v1/me`; the implementation uses
  `/api/v1/auth/refresh` and `/api/v1/users/me` per `AGENTS.md`.
- The PRD suggests React/Next.js for web; `AGENTS.md` chose one Flutter client
  for iOS, Android and web.
- The PRD models documents as `files` + `document_links`; the implementation
  has one `documents` table per trip/plan. Vault and multi-entity linking will
  need that split.
