# Dorago implementation status

Last updated: 2026-09-05.

This file records implementation evidence separately from the required
completion criteria in `MIGRATION_PLAN.md`. A phase is not complete merely
because source exists.

| Phase | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| 1. Audit and baseline | Complete | `CURRENT_ARCHITECTURE_AUDIT.md`, `MIGRATION_PLAN.md`, root ignore/config contracts; React source preserved | Commit the currently untracked baseline before team work |
| 2. Backend/schema foundation | Complete | Domain-separated FastAPI app, OpenAPI, async SQLAlchemy models, Alembic `0001`, timezone/DST tests; PostgreSQL 16.15 upgrade, drift check, downgrade, and integration suite pass | None for this phase |
| 3. Authentication | Implemented, external verification pending | Hashed single-use OTPs, SMTP, Redis limits, rotating hashed refresh tokens, revocation, secure web/mobile handling, PostgreSQL-backed auth tests | Live Redis and SMTP smoke tests |
| 4. Trip/plan services | Complete | PostgreSQL-backed owner-scoped CRUD/IDOR, UUIDs, versions, tombstones, chronology, costs, separate timezone fields, override provenance, validated type-specific detail schemas | None for this phase |
| 5. Flutter core parity | Partially complete | URL routing, auth/onboarding, Trips, Next Up, trip tabs, plan/trip forms, profile/export, responsive navigation; Web release build succeeds | Android/iOS builds, broader widget/integration tests, signed UI parity review |
| 6. AI import | Implemented, external verification pending | Backend-only Gemini, strict extraction schema, no fallback, private files, warnings/confidence, editable review, existing/new-trip transactional acceptance, PostgreSQL-backed acceptance/override test | Live configured Gemini smoke test |
| 7. Documents/reminders/locations | Implemented, external verification pending | Private validated uploads, owner-authorized API downloads, reminder reschedule/cancel lifecycle, map links, explicit unavailable geocoder | Real MinIO lifecycle test and mobile notification device test |
| 8. Offline sync | Partially complete | Drift trip/plan/document cache, versioned stable mutations, tombstones, server idempotency receipts/cursors, acknowledgement-only clearing, last-sync display, conflict banner, offline tests | Full reconnect and conflict-resolution UX tests |
| 9. Deployment | Implemented, not exercised locally | API/Web Dockerfiles, private Compose network, PostgreSQL/Redis/MinIO/Caddy/migration services, CI and runbook | Docker deploy, HTTPS, migration, backup/restore, and security smoke tests on a clean host |
| 10. Parity cutover | Not started | React prototype remains untouched at the root | All prior gates, mobile release builds, product sign-off, rollback rehearsal, then legacy move |

## Latest local verification

- FastAPI: Ruff format/check clean and mypy clean across 56 source files. The
  Alembic upgrade, metadata-drift check, and downgrade pass against PostgreSQL
  16.15; all 40 unit and PostgreSQL integration tests pass.
- Flutter: formatter and analyzer clean; 5 tests pass, including offline queued
  mutation/tombstone and document-metadata coverage; Flutter Web release build
  succeeds.
- Local platform limitations: Docker/Podman, Android SDK, and full
  Xcode/CocoaPods are not installed. Android/iOS and Compose release gates have
  therefore not been claimed as complete. PostgreSQL was exercised from a
  temporary official PostgreSQL 16.15 distribution.

No React source has been deleted or moved. No prototype localStorage data or
Supabase draft schema is treated as production data.
