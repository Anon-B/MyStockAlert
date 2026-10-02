# Phase 6 - Testing

## Scope
Testing covers backend API/database, alert logic, calendar, provider behavior, worker behavior and an E2E smoke path.

## Test Layers
### Backend
Files under `backend/tests/` cover API, CRUD edges, helpers, settings, alerts, portfolio alerts, market/provider and calendar.

### Worker
`worker/tests/test_main.py` covers successful and failed market polling.

### Frontend
Production build is the current compile/type verification. A dedicated browser test suite is still a future improvement.

### End-to-End
`scripts/test_e2e.sh` checks API/web health, creates temporary portfolio/watchlist records, evaluates alerts and deletes the temporary records.

## Commands
```bash
docker-compose exec backend pytest -q
docker-compose exec worker pytest -q
./scripts/test_e2e.sh
docker-compose build frontend
```

## Test Principles
- no external provider dependency in unit tests
- mock provider/network failure paths
- test alert edge/re-arm behavior
- test trading calendar boundaries
- clean up E2E test data

## Current Gap
CI is not yet configured; local verification is the current gate.
