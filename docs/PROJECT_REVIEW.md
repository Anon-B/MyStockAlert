# MyStockAlert Review

## Current state
- Phase 0 Foundation: complete
- Phase 1 Core API: complete
- Phase 2 Web UI: complete
- Phase 3 Market Data: complete
- Phase 4 Alert Engine: complete
- Phase 5 LINE Messaging API: skipped by request
- Phase 6 Testing: completed with mock data and real Docker/PostgreSQL execution

## What is working
- Portfolio and watchlist CRUD APIs
- TH and US market separation
- Market quote adapter and PostgreSQL quote cache
- Cached quote fallback when provider fails
- Watchlist threshold hysteresis
- Portfolio open/close alert generation
- Background worker polling
- Frontend dashboard, portfolio, watchlist, alerts and settings views
- Dockerized local runtime

## Important gaps to add

### 1. Authentication and authorization
Current API uses a fixed demo user. Add login/session or JWT, password hashing, authorization checks, and user isolation tests.

### 2. Real trading calendars
Current calendar handles weekdays plus an optional in-memory holiday set. Add provider-backed TH/US exchange holidays, half-days, daylight-saving validation, and calendar tests per year.

### 3. Market data resilience
Add provider timeout/retry/backoff, rate-limit handling, provider health, quote freshness rules, and a second provider adapter before relying on production alerts.

### 4. Alert delivery model
Phase 5 is still missing. Before LINE, separate triggered_at from delivered_at. Add retry_count, last_error, delivery status, idempotency key, and a durable delivery queue/outbox.

### 5. Frontend completeness
The current UI supports adding records but does not yet expose edit/delete controls for portfolio/watchlist. Add forms with validation, confirmation dialogs, loading/error states, market status, stale badges, and real API health status.

### 6. Portfolio calculations
Add explicit current value, cost basis, P/L amount, P/L percentage, THB/USD totals, optional FX conversion, and clear treatment of stale/missing quotes.

### 7. Settings
Replace the generic key/value screen with typed settings for refresh, notification behavior, market schedule, display, currency and system status.

### 8. Database hardening
Add indexes for user/market/symbol and alert-history queries, migration rollback tests, constraints for market/currency combinations, and timestamp update behavior.

### 9. Observability
Add structured logs, correlation/request IDs, worker heartbeat, provider latency/error metrics, alert evaluation metrics, and a system-status endpoint backed by actual checks.

### 10. Security and operations
Move secrets to environment/secret storage, add CORS policy, request validation, rate limiting, backup/restore procedure, health/readiness probes, and dependency/security scanning.

### 11. Testing maturity
Add coverage thresholds, mutation/property tests for threshold logic, contract tests for API schemas, browser E2E tests, migration tests, concurrency tests for duplicate alerts, and deterministic time injection.

## Recommended implementation order
1. Authentication + authorization
2. Complete portfolio/watchlist UI CRUD
3. Real market calendar + provider resilience
4. Portfolio/P&L and FX calculations
5. Durable alert delivery/outbox
6. LINE Messaging API
7. Observability + security hardening
8. Browser E2E and load/concurrency testing
9. Backup/restore and release checklist
