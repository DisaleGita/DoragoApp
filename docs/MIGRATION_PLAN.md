# Dorago Migration Plan

This plan preserves the React prototype until Flutter parity and treats current localStorage/Supabase records as demo-only. Completion requires evidence for every phase; a build passing with disabled checks is not completion.

Implementation progress and outstanding release gates are tracked in
`IMPLEMENTATION_STATUS.md`; the criteria below remain the authoritative
definition of completion.

## Target contracts

- Layout: `apps/flutter/`, `services/api/`, `infra/`, `docs/`; later `legacy/react-prototype/` after parity.
- API: FastAPI under `/api/v1`, snake_case JSON, UUIDs, ISO-8601 timestamps, OpenAPI, and `{code,message,details,request_id}` errors.
- Plans: all 21 categories, including Shuttle, with independent local/UTC start and end times and IANA start/end timezones.
- Data: PostgreSQL authoritative; Redis only for rate limits, short-lived coordination and caching; Drift for offline cache/queue.
- Files: private S3-compatible storage through an adapter, initially MinIO and later DigitalOcean Spaces.
- Client: Flutter for iOS, Android, and Web with go_router, Riverpod, Dio, Freezed/json_serializable, Drift, secure storage, and local notifications.

## 1. Audit and repository baseline

- Preserve current React files and record the audit/reuse matrix.
- Add ignore rules and an environment-variable example without secrets.
- Establish formatting, linting, test and build commands for each project.

Completion criteria:

- The architecture audit covers all requested areas with evidence and severity.
- No legacy source is moved or deleted.
- Local secrets and generated outputs are ignored.

## 2. Backend and schema foundation

- Scaffold FastAPI domain modules for auth, users, trips, plans, imports, documents, reminders, locations, analytics, and sync.
- Create SQLAlchemy 2 async models and Alembic migrations for users/settings, OTP challenges, sessions, trips, plan items, provenance, versions, reminders, documents, imports/parser runs, sync receipts and analytics.
- Validate IANA timezones and derive UTC timestamps server-side. Store separate start/end timezones.

Completion criteria:

- Health and OpenAPI endpoints work.
- A clean PostgreSQL database upgrades and downgrades through Alembic.
- Model/schema tests include every plan category and cross-zone/DST cases.

## 3. Secure email OTP and sessions

- Generate six digits with a cryptographic RNG and store only a keyed digest.
- Enforce expiry, single use, attempt/resend limits, and Redis email/IP throttles.
- Deliver through SMTP. Allow test/dev capture only behind explicit non-production configuration.
- Issue short access JWTs and rotating opaque refresh tokens stored as hashes, with reuse detection and revocation.
- Use secure HttpOnly cookies on web and secure storage on mobile.

Completion criteria:

- Universal/offline codes fail; OTP values never reach logs or production responses.
- Refresh rotation, logout, ownership, expiry and attempt-limit tests pass.
- Account deletion is authenticated and removes database/object data.

## 4. Trip and plan services

- Implement owner-scoped trip and plan CRUD, duplicate, archive and soft-delete operations.
- Add optimistic versions, tombstones, cost aggregation and plan-version history.
- Validate dates, timezones, currencies, statuses and category-specific details.
- Persist per-field provenance and make user overrides immune to silent provider/AI replacement.

Completion criteria:

- CRUD, IDOR, timeline ordering, version conflict, deletion and override tests pass.
- No endpoint accepts authoritative ownership from a client field.

## 5. Flutter core parity

- Port login/OTP/onboarding, Trips Home, Next Up, trip detail tabs, create/edit flows, timeline cards, profile and sharing.
- Use generated API DTOs mapped to independent domain models.
- Implement URL-backed routes and browser refresh handling with accessible dialogs, focus and scalable viewport behavior.

Completion criteria:

- iOS, Android and Web builds pass.
- Unit/widget/integration tests cover login, create trip/plan, timeline, profile and logout.
- A UI parity checklist confirms wording, hierarchy and critical interactions.

## 6. AI import and review

- Store an authenticated import source and parser run for text/private file input.
- Call Gemini only in FastAPI and validate responses with strict Pydantic schemas.
- Keep unknown values null and return useful failures without fake fallback plans.
- Show all warnings/confidence, allow complete corrections, and accept selected proposals transactionally into an existing or new trip.
- Store provenance and protect corrections as field overrides.

Completion criteria:

- Missing fields remain null and failed/invalid model output creates no itinerary data.
- Prompt-injection, duplicate, transaction and override-regression tests pass.

## 7. Documents, reminders and locations

- Validate and stream private uploads to MinIO; authorize metadata, signed download and deletion.
- Store reminders on the server and schedule/cancel Flutter mobile notifications on data changes.
- Preserve the chronological places list and map deep links; put geocoding behind a replaceable provider with no fabricated coordinates.

Completion criteria:

- Cross-user file/plan access fails and invalid files are rejected.
- Stored bytes survive reopen and no browser blob URL is authoritative.
- Reminder lifecycle and location-provider failure tests pass.

## 8. Offline synchronization

- Cache current/upcoming trips, plans, confirmation data, notes, document metadata, entity versions, tombstones and sync cursors in Drift.
- Queue supported edits with stable mutation IDs and base versions.
- Acknowledge and remove mutations only after server success; surface conflicts for resolution.

Completion criteria:

- Offline reopen, retry, idempotent replay, deletion, conflict and reconnect tests pass.
- Last-sync time advances only after a server acknowledgement.

## 9. Deployment and operations

- Containerize API and Flutter Web with PostgreSQL, Redis, MinIO and Caddy in Compose.
- Add migration execution, HTTPS/domain routing, CORS, cookie/CSRF and security headers, request limits, redacted structured logs, health/readiness, backups and restore guidance.

Completion criteria:

- A clean environment deploys at `https://<domain>` and `/api/v1`.
- Secrets are external to the repository and images.
- Security, migration, backup/restore and browser-route smoke tests pass.

## 10. Parity cutover

- Validate login, trip/plan CRUD, timeline, AI review, documents, reminders, maps, offline reopen, profile/export, logout and deletion end to end.
- Move the React prototype only after Flutter is accepted; never deploy its Express server or browser services.
- Document rollback and production monitoring.

Completion criteria:

- Flutter Web is the production client and mobile release builds pass.
- The parity checklist is signed off and rollback is rehearsed.
- The prototype remains available under `legacy/react-prototype/` as a reference.

## Assumptions

- Existing records are prototype/demo data, so no localStorage or Supabase ETL is required.
- Demo fixtures require explicit development/test configuration.
- Caddy, MinIO, SMTP, PostgreSQL and Redis are the initial implementations.
- User-visible React behavior is preserved unless it is unsafe, fabricated, inaccessible or demonstrably broken.
