# DigitalOcean deployment runbook

## Host preparation

Use a supported DigitalOcean Ubuntu LTS droplet with Docker Engine, the Compose
plugin, a firewall allowing only SSH, HTTP, and HTTPS, and DNS pointing
`APP_DOMAIN` at the droplet. Keep `.env` readable only by the deployment user.
Never expose PostgreSQL, Redis, MinIO, or the MinIO console on a public port.

The pinned MinIO binary image is a legacy distribution and must be included in
dependency/security review before each production rollout. Confirm licensing
obligations and supported alternatives; the API storage adapter can instead
target DigitalOcean Spaces without changing document domain behavior.

Create `.env` from `.env.example` and generate independent high-entropy values
for `POSTGRES_PASSWORD`, `JWT_SECRET`, `OTP_HASH_SECRET`,
`MINIO_ROOT_PASSWORD`, and every third-party credential. Production must use
`APP_ENV=production`, `ENABLE_DEV_OTP_BYPASS=false`, working SMTP settings, and
an exact HTTPS `CORS_ALLOWED_ORIGINS` value.

Mobile release signing material belongs in the protected CI/release system,
never in this repository. The Android project deliberately does not fall back
to a debug signing key for release artifacts; configure the release keystore at
the release boundary. Configure the iOS team, bundle identifier, and signing
profile in the protected Apple release environment.

## Deploy and migrate

From `infra/`:

```sh
docker compose --env-file ../.env -f compose.yaml config
docker compose --env-file ../.env -f compose.yaml build --pull
docker compose --env-file ../.env -f compose.yaml up -d
docker compose --env-file ../.env -f compose.yaml ps
```

The API does not start until the one-shot Alembic migration and private bucket
initialization succeed. Verify `/api/v1/health/live` and
`/api/v1/health/ready` through the public HTTPS endpoint after every deploy.

## Backup

Schedule encrypted off-host backups. A database backup is created with
`pg_dump --format=custom`; object data is mirrored from the private MinIO bucket
with `mc mirror`. Keep the database dump and matching object snapshot together.
Do not treat Redis as recoverable application data.

Example commands are intentionally parameterized; resolve and inspect every
target before running them:

```sh
docker compose --env-file ../.env -f compose.yaml exec -T postgres \
  pg_dump --username "$POSTGRES_USER" --format=custom "$POSTGRES_DB" > dorago.dump

docker compose --env-file ../.env -f compose.yaml run --rm minio-init \
  mc mirror dorago/"$STORAGE_BUCKET" /backup/documents
```

Store outputs outside the droplet. Retention, encryption keys, and monitoring
must be configured in the hosting account rather than committed here.

## Restore drill

Perform restores only into a new empty environment first. Stop API writes,
restore the PostgreSQL custom dump with `pg_restore`, mirror objects into the
new private bucket, run `alembic upgrade head`, and execute ownership/document
smoke tests. Switch DNS only after record counts, signed downloads, login, and
trip timelines have been verified. Record recovery time and any manual step.

## Rollback

Retain the prior immutable API and Flutter image tags. Application rollback is
performed by selecting those image tags and redeploying; schema downgrade is a
separate reviewed operation and must never be automatic. If a migration is not
backward compatible, restore the pre-deploy database/object snapshot into a new
environment instead of forcing a destructive downgrade in place.
