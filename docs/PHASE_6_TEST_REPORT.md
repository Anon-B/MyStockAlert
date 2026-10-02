# Phase 6 Test Report

## Scope
Phase 5 LINE Messaging API remains skipped. This test pass uses mock market-provider responses and real PostgreSQL/Docker services.

## Coverage
- API health and helper validation
- Portfolio list/create/update/delete + validation/not-found
- Watchlist list/create/update/delete + duplicate/conflict/disable paths
- Settings list/upsert/delete + validation
- Alert history limits
- TH/US market calendar, sessions, weekend and holiday behavior
- Yahoo provider TH .BK mapping and US mapping with mocked HTTP responses
- Market quote cache, provider failure fallback and missing-cache behavior
- Watchlist upper/lower threshold hysteresis
- Portfolio market-open/market-close events and duplicate prevention
- Worker poll success/failure
- Frontend smoke checks and production build
- End-to-end API/UI availability and CRUD flow

## Result
Backend: 24 tests passed in the full suite before the final helper additions; the helper tests are rerun before commit.
Worker: 2 tests passed.
Frontend: smoke test and production build passed.
E2E: passed.

## Defect found by tests
The original market calendar returned no session_close after a session ended. As a result, portfolio close alerts could not be created after market close. Phase 6 fixed market_status() so a trading day exposes the final session close even when the market is currently closed, while open still reflects the active session.
