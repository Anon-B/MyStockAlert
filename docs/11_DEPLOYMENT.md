# Deployment

## Local Runtime
Docker Compose ใช้ 4 services:
- postgres:17-alpine
- backend
- worker
- frontend

## Start
```bash
docker-compose up -d --build
docker-compose ps
```

## Verify
```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:3000 >/dev/null
```

## Logs
```bash
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Stop / Reset
```bash
docker-compose down
```
ลบ volume เฉพาะเมื่อยอมรับการลบ local database:
```bash
docker-compose down -v
```

## Migration
Backend startup executes:
```bash
alembic upgrade head
```

Manual:
```bash
docker-compose exec backend alembic current
docker-compose exec backend alembic upgrade head
```

## Build Frontend
```bash
docker-compose build frontend
docker-compose up -d --no-deps frontend
```

## Backup
Local PostgreSQL:
```bash
docker-compose exec -T postgres pg_dump -U mystockalert mystockalert > backup.sql
```
Restore policyยังต้องกำหนดและทดสอบก่อน production.

## Production Notes
อย่าใช้ default `change-me`, อย่า expose PostgreSQL โดยไม่จำเป็น และต้องมี TLS/auth/backup/monitoring.
