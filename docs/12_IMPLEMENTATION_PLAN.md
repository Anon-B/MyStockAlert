# Implementation Plan

## Phase 0 - Foundation — COMPLETED
- Docker Compose
- PostgreSQL
- FastAPI
- Next.js
- Worker
- health endpoints

## Phase 1 - Database and Core API — COMPLETED
- Alembic
- Portfolio CRUD
- Watchlist CRUD
- Settings
- Alert history

## Phase 2 - Web UI — COMPLETED
- Dashboard
- Portfolio
- Watchlist
- Alert History
- Settings
- System Status
- responsive styling / themes

## Phase 3 - Market Data — COMPLETED
- Yahoo quote/search
- quote cache
- provider health
- market status
- Stock Master
- USD/THB FX + fallback

## Phase 4 - Alert Engine — COMPLETED
- watchlist price/% rules
- armed/re-arm logic
- portfolio session alerts
- idempotency
- outbox records

## Phase 5 - LINE — DEFERRED
Data model is prepared; actual sender/provider is not enabled.

## Phase 6 - Testing — COMPLETED
- API/database tests
- alert tests
- calendar tests
- provider tests
- worker tests
- E2E smoke script

## Phase 7 - Hardening — PARTIAL / CONTINUING
Completed hardening includes CRUD edge cases, calendar logic, provider resilience, portfolio summary, settings, alert state and DB migrations.

Remaining production hardening:
1. real authentication/authorization
2. real notification delivery
3. secrets management
4. production observability
5. backup/restore automation
6. provider abstraction expansion
7. stronger frontend test coverage
8. CI/CD

## V1 Definition of Done
For local/single-user scope:
- code committed and tagged `v1.0.0`
- branches `main`, `dev`, `release/v1.0.0`
- public repository
- Docker services runnable
- migrations reproducible
- core workflows implemented
- docs synchronized

Production Definition of Done requires the remaining Phase 7 items.
