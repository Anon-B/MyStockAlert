# MyStockAlert Review

## Current State — 2026-10-03
Version `v1.0.0` is tagged and published to the public GitHub repository. Local architecture is functional for single-user development.

## Working Areas
- Docker Compose runtime
- PostgreSQL + Alembic
- Portfolio CRUD
- BUY/SELL transaction records
- optional transaction fees
- Watchlist CRUD
- alert engine
- market calendar
- Yahoo quote/search
- quote cache
- Stock Master
- USD/THB FX fallback
- Dashboard / Portfolio / Watchlist / Settings / System Status UI
- worker polling
- automated tests and E2E smoke

## Latest UX Direction
Portfolio → Transaction → Watchlist → Alert → Settings now follows the mental model: search → select → enter only required data → save. Technical state is progressively hidden from normal users.

## Important Gaps
### Authentication
Current API uses a seeded `demo` user.

### Notification
Outbox exists but actual LINE delivery is deferred.

### Production Operations
No CI/CD, centralized logs, metrics, secret manager or automated backup/restore yet.

### External Data
Yahoo/Frankfurter availability and rate limits remain external dependencies.

### Frontend Testing
Build verification exists; browser-level regression suite should be added.

## Current Architecture Decision
PostgreSQL is the source of truth. Providers populate cached/master data. Frontend consumes API rather than calling providers directly.

## Recommended Next Work
1. Authentication/authorization
2. LINE delivery worker
3. CI/CD
4. backup/restore automation
5. observability
6. frontend E2E tests
7. provider abstraction expansion

## Release Note
`v1.0.0` is a stable local/single-user baseline, not a claim of production readiness. Production deployment should complete the hardening items above.
