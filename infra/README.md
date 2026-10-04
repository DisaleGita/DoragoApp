# Dorago deployment

The Compose topology exposes only Caddy. PostgreSQL, Redis, SeaweedFS (private
S3-compatible object storage), the API, and the Flutter web server remain on the
private Docker network. Stored objects are private; the authenticated API
verifies ownership and streams downloads without publishing storage or durable
object URLs. SeaweedFS replaced MinIO, which no longer publishes pullable Docker
images; the API only speaks S3, so DigitalOcean Spaces can replace it by
changing `STORAGE_*` settings.

## First deployment

1. Copy `.env.example` to `.env` outside source control.
2. Generate independent, high-entropy values for all database, JWT, OTP, and
   storage secrets. Configure SMTP and Gemini; do not enable the development OTP
   bypass in production.
3. Set `APP_ENV=production`, `APP_DOMAIN`, and the exact HTTPS web origin in
   `CORS_ALLOWED_ORIGINS`.
4. Run `docker compose --env-file ../.env -f compose.yaml config` from `infra/`
   and review the resolved configuration.
5. Run `docker compose --env-file ../.env -f compose.yaml up -d --build`.

The one-shot `migrate` and `storage-init` services must complete before the API
starts; `storage-init` creates the private bucket. Back up both the PostgreSQL
database and the `seaweedfs-data` volume. A restore drill is required before a
production launch; Redis is intentionally not an authoritative datastore.
