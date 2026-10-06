# Free demo deployment

A zero-cost way to run Dorago publicly for demos. For a production launch use
the Docker Compose deployment in `DEPLOYMENT.md`.

```
Browser ──► Vercel (Flutter web)  ──/api/*──►  Render (FastAPI, Docker)
                                                 ├─ Neon       PostgreSQL
                                                 ├─ Upstash    Redis
                                                 ├─ Backblaze  B2 private S3 bucket
                                                 ├─ Brevo      SMTP for login codes
                                                 └─ Gemini     AI import (optional)
```

Vercel rewrites `/api/*` to Render, so the browser sees a single origin and the
refresh-token cookie works without cross-site settings.

## Limits to expect

- Render's free web service sleeps after about 15 minutes without traffic; the
  first request afterwards takes 30–60 seconds.
- Each provider's free tier has its own quotas. Check them when signing up.
- Vercel proxies `/api/*` requests; very large uploads may hit Vercel's request
  size limit before the API's 15 MB limit. Test with the largest expected file.

## 1. Neon (PostgreSQL)

Create a project and copy the connection string from **Connect**. Use the
direct (not pooled) connection. Paste it unchanged: the API converts
`postgresql://…?sslmode=require&channel_binding=require` to the asyncpg form.

## 2. Upstash (Redis)

Create a Redis database and copy the `rediss://` URL (TLS).

## 3. Backblaze B2 (documents)

Create a **private** bucket, then an application key restricted to that bucket
with read and write access. Note the bucket's S3 endpoint, for example
`https://s3.us-east-005.backblazeb2.com`; the region is the part after `s3.`
(`us-east-005`).

## 4. Brevo (login emails)

Verify a sender address, then create an SMTP key under **SMTP & API**. The SMTP
login is shown on the same page.

## 5. Render (API)

New → **Blueprint** → select this repository. Render reads `render.yaml`,
generates `JWT_SECRET` and `OTP_HASH_SECRET`, and asks for the rest:

| Variable | Value |
| --- | --- |
| `APP_DOMAIN` | the Vercel domain, e.g. `dorago.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://` + the Vercel domain |
| `DATABASE_URL` | Neon connection string |
| `REDIS_URL` | Upstash `rediss://` URL |
| `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | Brevo SMTP login, key, verified sender |
| `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET` | B2 endpoint, region, bucket name |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | B2 key ID and application key |
| `GEMINI_API_KEY` | optional; leave blank to show "AI import unavailable" |

Migrations run on start (`RUN_MIGRATIONS_ON_START=true`). When the deploy is
live, `https://<service>.onrender.com/api/v1/health/ready` returns
`{"status":"ready"}`.

## 6. Vercel (web)

Import the repository and set **Root Directory** to `apps/flutter`; Vercel reads
`apps/flutter/vercel.json`, installs Flutter 3.47.6 and builds the web app. If
the Render URL is not `https://dorago-api.onrender.com`, update the rewrite
`destination` in `vercel.json` first.

## Smoke test

1. Open the Vercel URL, request a code, and confirm the email arrives.
2. Sign in, create a trip and a plan, refresh the page.
3. Upload and download a document.
4. `https://<vercel-domain>/api/v1/health/ready` returns `{"status":"ready"}`.
