# Phase 7 — Hardening Items 2–8

Implemented items from the project review:
- 2. Frontend CRUD completeness
- 3. Trading calendar
- 4. Market-data resilience
- 5. Portfolio/P&L calculations
- 6. Alert delivery/outbox model
- 7. Typed settings
- 8. Database hardening

## Frontend CRUD
Portfolio and Watchlist now expose add, edit and delete controls.
Market/currency are normalized and validated by the API.
Dashboard shows THB and USD totals separately.
System status is loaded from the real API instead of a hard-coded badge.

## Trading calendar
TH uses Asia/Bangkok with SET 2026 holidays.
US uses America/New_York with NYSE 2026 holidays.
US early closes implemented for 2026-11-27 and 2026-12-24.
DST is handled by ZoneInfo.
Weekend and holiday tests remain deterministic.

## Market-data resilience
Yahoo provider now uses a 5-second timeout, retry loop and exponential backoff.
HTTP 429 is treated as provider rate limiting.
Quote cache remains the fallback when provider calls fail.
Provider health endpoint reports live provider status and latency.
## Portfolio calculations
`GET /api/v1/portfolio/summary` now returns cost basis, current value, P/L amount,
P/L percentage and stale status for each enabled holding.
THB and USD totals are kept separate.
An FX setting is exposed in the typed Settings UI; cross-currency display is not
forced when native currency is selected.

## Alert delivery model
Alert creation now records triggered_at separately from delivery.
sent_at/delivered_at remain empty until a delivery adapter succeeds.
retry_count and last_error are stored on alert history.
alert_outbox provides a durable pending delivery record with attempts and next_attempt_at.
idempotency_key prevents duplicate alert creation.

LINE remains intentionally skipped; the outbox is ready for a later LINE adapter.

## Typed settings
The UI exposes refresh interval, notification toggle, open/close alert toggles,
display currency and USD/THB FX.
Existing generic settings API remains backward compatible.

## Database hardening
Migration 0004 adds query indexes, market/currency checks, alert idempotency,
and outbox indexes.
Migration 0005 adds database-level updated_at triggers.
Alembic head verified at 0005_timestamp_triggers.

## Verification
- Backend calendar/provider/helper tests: 8 passed.
- Worker tests: 2 passed.
- Frontend smoke test: passed.
- Next.js production build: passed.
- Real API CRUD/P&L/alert evaluation executed against Docker PostgreSQL.
- Duplicate alert evaluation returned created=0.
- Provider health was exercised against live Yahoo; current Yahoo calls failed,
  and the cache fallback remained available.
- Test records are intentionally NOT deleted.
