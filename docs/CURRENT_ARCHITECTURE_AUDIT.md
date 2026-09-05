# Dorago Current Architecture Audit

Date: 2026-09-04  
Scope: complete tracked repository prior to the Flutter/FastAPI migration  
Method: static source inspection. Runtime verification was attempted with `npm run lint`, but dependencies are not installed and `tsc` was unavailable.

## Executive assessment

Dorago is currently a polished React/Vite interaction prototype backed by browser state and a single Express process. It is useful as a visual and behavioral reference, but it is not a secure or durable application. The React presentation concepts, itinerary terminology, seed scenarios, and portions of the conceptual SQL model should be retained. Authentication, persistence, authorization, AI ingestion, file storage, reminders, offline synchronization, geocoding, tests, and deployment must be replaced.

At audit time the application files had only just been added to Git in commit `b729c4d`; the prior commit contained only `LICENSE`. There was no root ignore policy, environment example, Python/Flutter project, Docker configuration, CI, or production test suite.

## 1. Directory structure

```text
/
├── server.ts                         Express API, Gemini, OTP and Vite hosting
├── src/
│   ├── App.tsx                       App state, navigation and workflow orchestration
│   ├── features/{auth,trips,import,profile,testing}
│   ├── components/{trips,plans,import,ui}
│   ├── services/                     Browser-side behavior
│   ├── storage/clientStorage.ts      localStorage abstraction
│   ├── data/seedData.ts              Shared demo records
│   ├── types/index.ts                TypeScript domain declarations
│   └── utils/dateTime.ts             Display and timezone helpers
├── supabase/migrations/              One disconnected SQL schema draft
└── Vite, TypeScript and package configuration
```

## 2. Frontend screens and components

Screens and surfaces:

1. `App.tsx`: authentication gate, in-memory view routing, bottom navigation, modal coordination, reminder toast.
2. `LoginScreen`: email form, demo-account quick fill, product benefits.
3. `OtpVerificationScreen`: six OTP inputs, paste/autoadvance, resend countdown, development code display.
4. `OnboardingScreen`: display name, home airport, currency, timezone and time-format preferences. This is unreachable because neither auth path returns first-login state.
5. `TripsHomeScreen`: search, status filters, Next Up, trip list, new/import/profile actions.
6. `TripDetailScreen`: timeline, documents, places/map links, cost/travelers/notes, share and trip actions.
7. `ImportScreen`: pasted text, PDF/image upload, target-trip picker and sample confirmations.
8. `ProfileScreen`: profile preferences, local statistics, JSON export, logout, delete, seed reset and QA tools.
9. `TestRunnerModal`: an in-application pseudo-test harness.

Feature components are `CreateTripModal`, `AddPlanModal`, `ImportReviewModal`, `NextUpCard`, and `TimelineCard`. UI primitives are `Badge`, `Button`, `EmptyState`, `Input`, `Modal`, `OfflineBanner`, and `PlanTypeIcon`.

## 3. User workflows present in source

- Request OTP, verify OTP, persist a browser session, log out and nominally delete an account.
- Initialize shared demo trips; search/filter trips; view Next Up and trip detail.
- Create, edit, archive and delete trips.
- Create, edit, delete and duplicate plans; group them by local day and sort by UTC start.
- Copy confirmation numbers and a text itinerary.
- Parse pasted confirmation text or a PDF/image, review/select proposals, edit title/confirmation number, warn about duplicates, and accept into a new or existing trip.
- Create/list/delete document metadata and temporarily open newly uploaded browser blobs.
- Create reminder metadata and show a toast.
- List plan places and open Google Maps search URLs.
- Edit local profile preferences and export locally cached JSON.

These behaviors are not authenticated server workflows. Runtime behavior was not certified because the dependency tree was unavailable.

## 4. Domain models

The TypeScript model includes `UserProfile`, `UserSettings`, `Trip`, `TripDestination`, `TravelerProfile`, a common `PlanItem`, detail payloads for major categories, `PlanVersion`, `PlanReminder`, `TravelDocument`, extracted AI fields/proposals/results, analytics events, and offline mutations.

The common plan shape correctly attempts to retain local and UTC timestamps, a timezone, source type, confidence, version, costs, confirmation, notes, location, and type-specific `details`. It does not represent separate start/end timezones, which is necessary for flights and other cross-zone travel.

The target product has 21 plan categories. The prototype and SQL contain 20 and omit `shuttle`. The AI prompt/schema supports an even smaller subset.

## 5. Trip and plan CRUD

All CRUD is synchronous localStorage mutation. IDs are timestamp/random strings. There is no authenticated server owner check. Trip deletion removes local plans but not documents, reminders, versions, or durable tombstones. Deleting the last trip causes demo records to be seeded again. Archive behavior changes `isArchived` but the UI path does not consistently update status.

Plans are sorted by `startAtUtc` and grouped by the date prefix in `startAtLocal`. Cost totals are recomputed per currency. Version snapshots are written to an undeclared localStorage key. Duplicating a plan fabricates a new confirmation ending in `-COPY`.

The plan form exposes meaningful specialized fields only for flight, lodging, and dining. Rail state exists without rendered inputs; most other plan types cannot capture a custom title, provider, or location.

## 6. AI import

`POST /api/ai/parse-travel` calls Gemini from Express and requests JSON. The client supports text and base64 file input, duplicate checks, review, selection, and acceptance. Only titles and confirmation numbers are editable in the review UI.

Critical failures:

- Output is parsed without runtime validation.
- A confidence of zero becomes `0.9` because `||` is used for defaults.
- Gemini failure invokes a heuristic fallback that invents complete travel records.
- Missing extracted dates/times are replaced during acceptance with fixed dates and arbitrary times.
- User overrides cannot reliably clear extracted fields and are not recorded per field.
- The selected target trip is discarded before review.
- Import source IDs are not persisted on plans.
- The fallback detects rail text but never creates a rail plan.
- The server schema and TypeScript proposal types disagree on categories and fields.
- File type and size are not independently validated.

## 7. Authentication

Authentication is demonstrative only. OTP codes use `Math.random`, are stored in plaintext memory, and are logged beside email addresses. `123456` and `000000` universally bypass verification. If the API is unavailable, the client accepts any six-character code and creates a local session. There is no email delivery, durable challenge, resend/IP/email rate limit, secure hash, refresh rotation, revocation, or server validation of the returned token.

Session expiry returned by the server is ignored. `ClientStorage.getSession` marks every stored session valid. Account deletion is unauthenticated, deletes only an in-memory OTP entry, and returns a false permanent-deletion statement.

## 8. Persistence and storage

Browser localStorage is authoritative for sessions, profiles, settings, trips, plans, documents, reminders, sync state, versions, and analytics. Records are global to the origin rather than scoped to the signed-in user. The storage abstraction describes itself as encrypted but performs plain JSON serialization.

The Supabase package is installed but unused. No code connects to PostgreSQL or applies the included SQL migration.

## 9. Offline behavior

The client monitors `navigator.onLine` and queues mutation objects. `flushQueue` makes no server calls, counts every mutation as processed, clears the queue, and advances the sync timestamp. Local trip/plan writes also update `lastSync`, and the default timestamp is “now” even when no synchronization has occurred. There are no versions, conflicts, idempotency guarantees, remote changes, or durable deletion semantics.

## 10. Documents

Upload creates only metadata and `URL.createObjectURL(file)`. File bytes are not persisted; the URL fails after reload and is never revoked. The displayed storage path is fictional and filenames are unsanitized. There is no ownership, MIME/extension/size validation, private object storage, signed URL, or storage deletion. Timeline attachment is broken because its hidden input exists only on the documents tab and the plan ID is discarded.

## 11. Reminders

Reminder records are saved locally. No operating-system/web notification is scheduled, reminders cannot be listed or managed through the UI, and they are not synchronized. The UI sends `at_event_time`, which is outside the TypeScript reminder union and is accepted only through `any`.

## 12. Maps and locations

The UI creates a chronological address list and opens Google Maps searches. The Express geocoder is unused and returns hard-coded city-center coordinates for a few keywords. It is not a real address geocoder. Requested geolocation permission is unused.

## 13. SQL migration

The SQL draft defines profiles, user settings, trips, destinations, traveler profiles, trip travelers, plan items, field provenance, plan versions, reminders, documents, import sources, parser runs, and analytics events.

Useful concepts include UUIDs, soft deletion, versions, provenance, private document metadata, import audit records, and UTC indexes. It cannot be adopted directly because it depends on Supabase `auth.users`, lacks auth/session tables, omits Shuttle, uses one plan timezone, has no update triggers, and is disconnected from application types.

RLS is enabled without policies for destinations, traveler tables, field sources, versions, and reminders. Analytics has no RLS enablement. Plan/document policies trust a supplied `user_id` without proving that referenced parent entities have the same owner.

## 14. Existing API routes

| Method | Route | Actual behavior |
|---|---|---|
| POST | `/api/auth/send-otp` | Creates/logs an in-memory OTP |
| POST | `/api/auth/verify-otp` | Accepts OTP or universal bypass and returns an unvalidated token |
| POST | `/api/auth/delete-account` | Deletes an OTP entry only |
| POST | `/api/ai/parse-travel` | Public Gemini/fabricated-fallback parser |
| POST | `/api/locations/geocode` | Public hard-coded keyword lookup |
| GET | `/api/health` | Process health |
| GET | `*` | Serves the SPA in production |

There are no user, trip, plan, document, reminder, import-acceptance, or sync APIs. Routes are not versioned and errors are inconsistent.

## 15. Security vulnerabilities

Critical issues are the universal/offline OTP bypass, plaintext/logged OTPs, unauthenticated delete/AI endpoints, nonexistent token validation, global cross-user browser records, fabricated AI output, and fake document/offline behavior. High risks include unlimited public Gemini usage, oversized unvalidated base64 input, client-controlled MIME, no ownership enforcement, no secret/configuration contract, and serving the backend bundle/source map from the same `dist` directory as public assets.

Other gaps include missing security headers, CORS/CSRF policy, audit logging, request IDs, redaction policy, dependency scanning, HTTPS/reverse proxy, backups, and failure-safe production configuration.

## 16. Fake/demo behavior prohibited in production

- Universal OTPs and client offline login.
- OTP response/display hints without an explicit development-only switch.
- Shared demo accounts and automatic global seed insertion.
- Fabricated heuristic parser results and default travel facts.
- Simulated sync acknowledgements.
- Browser blob document storage and fictional object paths.
- Hard-coded geocoding responses.
- In-app tests presented as production verification.

## 17–18. Reuse versus rewrite

Reuse conceptually:

- Visual style, card hierarchy, navigation, timeline, Next Up, import review, trip tabs, wording, labels/icons, cost grouping, duplicate warnings, profile preferences, and sanitized demo scenarios.
- Common PlanItem/type-specific details, versions, provenance, import sources, private document metadata, UUIDs, and soft deletion.

Rewrite:

- The Express server and every executable browser service/storage implementation.
- Authentication, authorization, sessions, database access, AI validation, time conversion, document storage, reminders, offline synchronization, geocoding, analytics transport, automated tests, and deployment.
- React presentation must be behaviorally ported to Flutter rather than translated line by line.
- The SQL draft must be replaced by Alembic migrations owned by FastAPI.

## 19. Storage/schema/type mismatches

- `dorago_plans` seed key versus `dorago_plan_items` application key.
- Timestamp/random string IDs versus UUID SQL fields.
- Nested destinations/travelers versus normalized SQL tables.
- `details` versus `details_json`, with no mapping layer.
- Non-UUID/unattached parser source IDs versus SQL UUID `source_id`.
- Missing Shuttle and inconsistent AI category/field sets.
- Invalid reminder type from UI.
- Supabase-auth foreign key versus standalone Express auth.
- Client-supplied plan/document user IDs versus relational ownership.
- One plan timezone versus cross-timezone itinerary requirements.

## 20. Obvious bugs and incomplete implementation

In addition to the defects above: timezone conversion ignores its timezone argument and silently returns the current instant for invalid input; AI acceptance has an operator-precedence bug; review hooks are conditionally reached; trip timezone has no form control; form state is incompletely reset; time-format preference is ignored; per-plan AI warnings/confidence are hidden; seeded documents can point to missing plans; clipboard/window failures are unhandled; trip status does not automatically follow dates; and the app has no real URL routing or accessible focus/zoom behavior.

## Audit conclusion

Treat the repository as a valuable product prototype and a security-negative implementation reference. Preserve user-visible behavior and domain lessons, but establish a new server-authoritative system beside it. No legacy data ETL is required because the current records are confirmed prototype/demo data only.

