# Dorago Engineering Instructions

## Product

Dorago is a travel itinerary organization application.

It allows travelers to organize trips containing flights, hotels, rental cars,
trains, restaurants, activities, meetings, transportation, reservations,
documents, confirmation numbers, costs, notes, and reminders into a single
chronological itinerary.

The long-term product includes AI-assisted travel import, flight intelligence,
sharing, alerts, travel documents, maps, travel guidance, offline access,
subscriptions, rewards, and business travel features.

The current objective is to build a secure, deployable MVP without preventing
those future capabilities.

---

# Non-Negotiable Product Rules

## Authentication

Authentication is EMAIL OTP ONLY.

Do not implement:

- passwords
- password reset
- Google login
- Apple login
- Facebook login
- Microsoft login
- other social authentication

Successful email OTP authentication verifies the email and authenticates the
user.

Development bypasses may exist only when explicitly enabled by a development
environment variable.

There must NEVER be universal production OTPs such as:

123456
000000

Never log production OTP values.

---

## AI Travel Parsing

AI must never fabricate travel information.

If a field does not exist in the user's source:

return null.

Never invent:

- dates
- flight numbers
- airport codes
- gates
- terminals
- confirmation numbers
- hotel names
- addresses
- prices
- travelers
- seats
- booking statuses

All AI-extracted information must be shown to the user for review before
creating itinerary records.

User corrections become user overrides and must not later be silently replaced
by another AI/provider update.

---

## Core Itinerary

Trips contain chronological PlanItems.

Architecture must support:

- Flight
- Hotel/Lodging
- Rental Car
- Train
- Bus
- Ferry
- Cruise
- Shuttle
- Taxi/Rideshare
- Parking
- Restaurant
- Meeting
- Event
- Activity
- Tour
- Attraction
- Ticket
- Travel Insurance
- Visa Appointment
- Custom Note
- Generic Reservation

Use a common PlanItem model plus type-specific fields.

Every plan must correctly store:

- local start time
- local end time
- IANA timezone
- UTC start time
- UTC end time

Never treat travel timestamps as naive timestamps.

---

# Target Architecture

## Client

Flutter + Dart

One Flutter project must support:

- iOS
- Android
- Web

Use a maintainable architecture.

Preferred technologies:

- go_router for routing
- Riverpod for application state/dependency injection
- Dio for API networking
- Freezed/json_serializable where useful
- Drift for local structured offline persistence
- flutter_secure_storage for sensitive mobile storage
- flutter_local_notifications for mobile reminders

Do not tightly couple domain logic to Flutter widgets.

Use layers such as:

presentation
application
domain
data

---

## Backend

Python 3.12+
FastAPI
Pydantic v2
SQLAlchemy 2.x
Alembic
PostgreSQL

Use async database operations where practical.

Backend modules should be separated by domain:

auth
users
trips
plans
imports
documents
reminders
locations
analytics

Do not build one enormous main.py.

---

## Authentication / Sessions

Backend owns authentication.

Required concepts:

users
email OTP challenges
sessions
refresh tokens
devices/security metadata

OTP:

- six digits
- cryptographically secure generation
- hashed before persistence
- single use
- expiration
- resend controls
- attempt limit
- email/IP rate limiting

Sessions:

- short-lived access token
- rotating refresh token
- revoke support
- logout
- logout-all/devices later

Never store plaintext refresh tokens in the database.

For Flutter mobile, sensitive tokens belong in secure storage.

For Flutter web, prefer secure HttpOnly/Secure/SameSite cookies for refresh
sessions instead of localStorage.

---

# Database

Production data must live in PostgreSQL.

Browser localStorage must NOT be the authoritative datastore.

Use UUID primary keys.

Use:

created_at
updated_at
deleted_at

where appropriate.

All database changes must be created through Alembic migrations.

Do not modify production schema manually.

---

# Authorization

Every backend operation must verify ownership/permissions.

Never trust a user_id supplied by the client.

The authenticated server identity determines ownership.

User A must never be able to access User B's:

- trips
- plans
- imports
- documents
- reminders
- profiles

by changing an ID in a request.

---

# Offline Architecture

The server remains the source of truth.

Flutter may maintain an offline cache.

Offline architecture must support:

- cached upcoming/current trips
- cached itinerary plans
- confirmation numbers
- notes
- selected document metadata
- queued supported edits
- last sync timestamp
- tombstones/deletions
- entity versions

Do not pretend an offline queue has synchronized if it never reached the
backend.

---

# Documents

Documents must not be stored as browser blob URLs.

Use a private storage abstraction.

For the initial DigitalOcean deployment, use S3-compatible storage such as
MinIO running privately in Docker.

The storage abstraction must later allow migration to DigitalOcean Spaces
without rewriting document domain logic.

Validate:

- MIME type
- extension
- file size
- ownership

Files must not be publicly accessible.

Downloads require authorization or expiring signed URLs.

---

# Gemini

Gemini is called ONLY from the backend.

GEMINI_API_KEY must never be included in:

- Flutter bundle
- Flutter web bundle
- repository
- committed config
- API responses

Use strict Pydantic schemas for AI output.

Validate model output before persisting anything.

No fake parser fallback is allowed in production.

If Gemini fails:

return a useful parsing failure to the user.

Do not manufacture a successful itinerary.

---

# API

Use versioned REST endpoints:

/api/v1/...

Return consistent error objects.

Use OpenAPI generated automatically by FastAPI.

Use typed request/response models.

Validate every external input.

---

# Deployment

The application will initially run on DigitalOcean.

Deployment must use Docker.

Create Dockerfiles and Docker Compose configuration for:

- API
- PostgreSQL
- Redis
- MinIO
- Flutter Web
- reverse proxy

Use Caddy or another production reverse proxy for HTTPS.

Do not hard-code the future domain.

Use environment configuration such as:

APP_DOMAIN

The production system must support:

https://<domain>
https://<domain>/api/v1/...

The Flutter web app should support normal browser route refreshes.

---

# Secrets

Never commit secrets.

Provide .env.example only.

At minimum support:

DATABASE_URL
REDIS_URL
JWT_SECRET
OTP_HASH_SECRET
GEMINI_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM_EMAIL
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
APP_DOMAIN
CORS_ALLOWED_ORIGINS

---

# Existing Application

The repository currently contains a React/Vite prototype.

Do NOT blindly delete it before useful behavior and visual design have been
ported.

Use it as the behavioral and UI reference for the Flutter implementation.

Preserve useful:

- UX concepts
- screen flows
- wording
- itinerary interactions
- plan type behavior
- AI review experience
- domain knowledge

Do not carry forward unsafe prototype implementation choices.

Specifically do NOT preserve:

- localStorage as primary persistence
- fake OTP authentication
- universal OTP codes
- fake travel parser fallback data
- simulated synchronization
- blob URLs as document storage

The legacy React application may be moved to:

legacy/react-prototype/

after the replacement application reaches parity.

---

# UI

Do not redesign Dorago unnecessarily.

The existing prototype is the visual reference.

Preserve its overall:

- clean travel-oriented design
- card hierarchy
- timeline concept
- Next Up experience
- import review experience
- trip/detail navigation

Improve responsiveness and accessibility while porting.

---

# Testing

Every production feature needs tests.

Backend:

pytest

At minimum test:

- authentication
- OTP expiration
- OTP attempt limits
- token refresh
- ownership authorization
- trip CRUD
- plan CRUD
- timeline order
- AI output validation
- document authorization
- account deletion

Flutter:

unit tests
widget tests
integration tests for critical workflows where practical

Critical flows:

Login
Create trip
Create plan
View timeline
AI import/review
Upload document
Offline reopen
Logout

---

# Quality Rules

Do not silence errors simply to make builds pass.

Do not leave TODO placeholders in critical authentication/security flows.

Do not create fake implementations and label them complete.

Do not generate example production credentials.

Do not expose stack traces to users.

Avoid duplicated domain models.

Keep changes understandable and incremental.

Run formatter, lint, static analysis, tests, and builds after each major phase.

Before replacing working behavior, understand it first.

When uncertain about a product requirement, preserve existing Dorago behavior
and document the decision.