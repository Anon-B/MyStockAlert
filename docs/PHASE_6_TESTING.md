# Phase 6 - Testing

## Scope
Phase 5 LINE Messaging API is intentionally skipped. Phase 6 validates the implemented V1 foundation through API, database, worker, alert, frontend, and end-to-end tests.

## Test Layers

### Backend API / Database
- pytest against the real PostgreSQL container
- health endpoint
- portfolio CRUD
- watchlist duplicate protection
- settings persistence
- market status / empty quote behavior

### Alert Engine
- upper threshold trigger
- anti-spam disarm behavior
- reset after crossing back below threshold
- second trigger after reset
- alert evaluation endpoint

### Worker
- successful market poll flow
- alert evaluation call
- failure handling without crashing the worker loop

### Frontend
- navigation/API/theme smoke markers
- Next.js production build and TypeScript validation

### End-to-End
- backend health
- frontend HTTP availability
- create portfolio
- create watchlist
- evaluate alerts
- cleanup created records

## Commands

Backend:
docker-compose exec -T backend pytest -q

Worker:
docker-compose exec -T worker pytest -q

Frontend:
cd frontend && npm run test && npm run build

E2E:
./scripts/test_e2e.sh

## Result
Phase 6 verification passed after fixing test isolation for the global market quote cache. Test data is removed after execution.
