# Operations Runbook

## Daily Local Start
```bash
cd /Users/anonpond/MyStockAlert
docker-compose up -d
docker-compose ps
```

Expected services: postgres, backend, worker, frontend.

## Health Check
```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:3000 >/dev/null
```

## Diagnose API
```bash
docker-compose logs --tail=100 backend
docker-compose exec backend alembic current
```

## Diagnose Worker
```bash
docker-compose logs --tail=100 worker
```
Look for `market poll ok` or `market poll failed`.

## Diagnose Provider
Open System Status or call:
```bash
curl -fsS http://127.0.0.1:8000/api/v1/market/providers/health
```

## Database
```bash
docker-compose exec postgres pg_isready -U mystockalert -d mystockalert
docker-compose exec backend alembic current
```

## Common Recovery
Rebuild all:
```bash
docker-compose down
docker-compose up -d --build
```

Rebuild frontend only:
```bash
docker-compose build frontend
docker-compose up -d --no-deps frontend
```

## Data Safety
Do not use `down -v` unless local database deletion is intended.

## Incident Checklist
1. Check `docker-compose ps`
2. Check backend health
3. Check backend logs
4. Check PostgreSQL health
5. Check provider health
6. Check quote freshness
7. Check pending alert outbox
8. Avoid destructive DB reset until backup/state is understood
