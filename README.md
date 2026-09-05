# Dorago

Dorago is a travel-itinerary organizer being migrated from an AI-assisted
React prototype to a deployable Flutter, FastAPI, PostgreSQL, Redis, and private
S3-compatible storage architecture.

The React/Vite application at the repository root remains a behavioral and
visual reference. It is not the production application and its Express server,
browser persistence, demo authentication, and fallback parser must not be
deployed.

## Repository layout

- `apps/flutter/` — iOS, Android, and Web client.
- `services/api/` — Python 3.12+ FastAPI service and Alembic migrations.
- `infra/` — Docker Compose and Caddy deployment topology.
- `docs/` — current-architecture audit, migration plan, status, and runbook.
- `src/` and `server.ts` — preserved React prototype reference.

## Local quality checks

Backend, from `services/api/` after installing `.[dev]` into a Python 3.12
virtual environment:

```sh
ruff format --check .
ruff check .
mypy app
pytest -q
```

Flutter, from `apps/flutter/` with a stable Flutter SDK:

```sh
flutter pub get
dart run build_runner build
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build web --release --dart-define=API_BASE_URL=/api/v1
```

PostgreSQL integration tests require `TEST_DATABASE_URL` to name a disposable
database ending in `_test`. The test harness refuses to reset any other name.

## Deployment

Create an untracked `.env` from `.env.example`, provide real secret values and
SMTP/storage configuration, and follow [the deployment runbook](docs/DEPLOYMENT.md).
Only Caddy is published by Compose; PostgreSQL, Redis, MinIO, the API, and the
Flutter web server remain private.

Architecture decisions and incomplete release gates are tracked in
[the migration plan](docs/MIGRATION_PLAN.md) and
[implementation status](docs/IMPLEMENTATION_STATUS.md).
