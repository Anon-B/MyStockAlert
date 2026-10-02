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

## Phase 3 - Market Data — COMPLETED
- [x] Provider adapter (Yahoo chart API)
- [x] Thai market symbol mapping (.BK)
- [x] US market integration
- [x] Trading calendar/timezone status (TH/US)
- [x] PostgreSQL market quote cache
- [x] Stale-data handling (>5 minutes)
- [x] Market quote API
- [x] Background worker polling
- [x] Dashboard/Portfolio current price and P/L display

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
