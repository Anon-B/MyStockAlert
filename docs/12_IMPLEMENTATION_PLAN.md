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

Remaining hardening is tracked separately because this project is private/internal for a 2–3 person team.

## Improvement Phase 1 - Core Reliability — IN PROGRESS
Scope and completion gates: `docs/17_PERSONAL_TEAM_IMPROVEMENT_PLAN.md`

1. Quote TH/US correctness and freshness
2. Watchlist current price
3. Portfolio valuation/P&L correctness
4. Alert evaluation, idempotency and re-arm
5. USD/THB FX and fallback
6. Provider/API error handling and cache preservation
7. Inline form validation
8. Duplicate-submit prevention
9. Automated + API + E2E/manual testing at phase completion

Future improvement phases:
- Phase 2: Data Safety / backup / restore
- Phase 3: UX polish
- Phase 4: Small-team features

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
