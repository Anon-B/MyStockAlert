# Phase 7 — Hardening

## Completed in Current Codebase
- frontend CRUD for Portfolio/Watchlist
- portfolio transaction model and UI
- optional fee fields
- trading calendar with 2026 holidays/early closes
- provider timeout/retry and cached quote fallback
- portfolio summary and stale quote indication
- Stock Master sync
- USD/THB FX with fallback
- alert armed/re-arm state
- idempotency keys
- AlertOutbox model
- Alembic migrations through 0009
- System Status UI

## Remaining Production Hardening
### 1. Authentication / Authorization
Replace demo-user dependency with real identity and authorization.

### 2. Notification Delivery
Implement LINE sender, retry/backoff and delivery status updates.

### 3. Secrets
Move secrets to secret manager and rotate credentials.

### 4. Observability
Add structured logs, metrics, tracing and alerting.

### 5. Database Operations
Automated backup, restore verification, retention and migration rollback strategy.

### 6. Provider Resilience
Provider abstraction for more than one quote provider and stronger rate-limit handling.

### 7. CI/CD
Run backend/worker tests, frontend build, security scans and deployment checks on every merge/release.

### 8. Frontend Tests
Add component/browser E2E tests for CRUD, settings and alert history.

## Verification
Before each release:
```bash
docker-compose build backend worker frontend
docker-compose up -d
docker-compose exec backend pytest -q
docker-compose exec worker pytest -q
./scripts/test_e2e.sh
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:3000 >/dev/null
```
