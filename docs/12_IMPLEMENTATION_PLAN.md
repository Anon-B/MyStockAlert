# Implementation Plan

## Phase 0 - Foundation — COMPLETED
- [x] Git repository
- [x] README
- [x] Docker Compose
- [x] Backend skeleton
- [x] Frontend skeleton
- [x] PostgreSQL
- [x] Worker skeleton
- [x] Health checks

## Phase 1 - Database and Core API — COMPLETED
- [x] Database migrations (Alembic)
- [x] Portfolio CRUD
- [x] Watchlist CRUD + threshold configuration
- [x] Settings API
- [x] Alert history API
- [x] API validation and duplicate handling

## Phase 2 - Web UI — COMPLETED
- [x] Dashboard
- [x] Portfolio page
- [x] Watchlist page
- [x] Alerts page
- [x] Settings page
- [x] API integration
- [x] Responsive layout and UI theme

## Phase 3 - Market Data
- Provider adapter
- Thai market integration
- US market integration
- Trading calendar
- Stale-data handling

## Phase 4 - Alert Engine
- Portfolio open/close jobs
- Threshold evaluation
- Anti-spam/reset logic
- Alert persistence

## Phase 5 - LINE
- Credential configuration
- Notification adapter
- Test notification
- Retry handling

## Phase 6 - Testing
- API tests
- Database tests
- Worker tests
- Alert rule tests
- Frontend tests
- End-to-end tests
## Phase 7 - Hardening
- Authentication
- Secret handling
- Backup/restore
- Logging
- Error handling
- Deployment documentation

## V1 Definition of Done
CRUD, percentage configuration, portfolio summaries, threshold alerts, LINE notifications, dashboard, and alert history work without manual database edits.
