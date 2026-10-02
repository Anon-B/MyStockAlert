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

## Phase 1 - Database and Core API
- Database migrations
- Portfolio CRUD
- Watchlist CRUD
- Settings
- Alert history

## Phase 2 - Web UI
- Dashboard
- Portfolio page
- Watchlist page
- Alerts page
- Settings page

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
