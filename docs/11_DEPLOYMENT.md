# Deployment

## Runtime
Use Docker Desktop and Docker Compose.

## Services
- frontend
- backend
- worker
- postgres

## Basic Commands
Start:
docker compose up -d

Check:
docker compose ps

Logs:
docker compose logs -f

Stop:
docker compose down

## Environment
Typical variables:
- DATABASE_URL
- APP_SECRET
- MARKET_DATA credentials
- LINE credentials

Do not commit the real .env file.

## Backup
Before using real portfolio data:
1. Create a database backup
2. Test restore
3. Document the backup location
4. Keep credentials separate from source code
