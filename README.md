# MyStockAlert

Personal Stock Portfolio & Alert System สำหรับหุ้นไทยและหุ้นสหรัฐ

**Current release:** `v1.0.0`  
**Current code line:** `main` / `dev`  
**Repository:** https://github.com/Anon-B/MyStockAlert

## Current capabilities
- Portfolio หุ้นไทย/สหรัฐ
- Portfolio transaction history: BUY / SELL
- Optional trading fees and FX rate per transaction
- Watchlist พร้อม threshold แบบ % และราคา
- Alert engine พร้อม anti-spam / re-arm / idempotency
- Market open/close alerts ตาม trading calendar
- Yahoo Finance market quotes, symbol search และ provider health
- Stock Master DB พร้อม sync
- USD/THB FX rate พร้อม fallback provider
- Dashboard, Portfolio, Watchlist, Alert History, Settings และ System Status
- PostgreSQL + Alembic migrations
- Background worker สำหรับ polling ราคาและ evaluate alerts
- Docker Compose local deployment

## Architecture
```text
Next.js 15
    |
    | HTTP /api/v1
    v
FastAPI 0.117
    |
    +--> PostgreSQL 17
    +--> Yahoo Finance / Frankfurter
    |
    +--> Alert Engine -> AlertOutbox
    |
    ^
    |
Worker (APScheduler)
```

## Quick start
```bash
docker-compose up -d --build
docker-compose ps
curl http://127.0.0.1:8000/health
open http://127.0.0.1:3000
```

Stop:
```bash
docker-compose down
```

## Environment
Copy `.env.example` to `.env` and replace secrets before non-local use. Never commit `.env`.

Main variables:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `APP_SECRET`
- `NEXT_PUBLIC_API_URL`
- `MARKET_POLL_SECONDS`

## API
Base URL: `http://127.0.0.1:8000`

Health:
- `GET /health`
- `GET /api/v1/health`

Portfolio:
- `GET/POST /api/v1/portfolio`
- `PUT/DELETE /api/v1/portfolio/{id}`
- `GET/POST /api/v1/portfolio/{id}/transactions`

Watchlist / Alerts / Settings:
- `GET/POST/PUT/DELETE /api/v1/watchlist[/{id}]`
- `GET /api/v1/alerts/history`
- `POST /api/v1/alerts/evaluate`
- `GET /api/v1/settings`
- `PUT/DELETE /api/v1/settings/{key}`

Market / FX / System:
- `GET /api/v1/portfolio/summary`
- `GET /api/v1/market/search`
- `GET/POST /api/v1/market/stocks/status|sync`
- `GET /api/v1/market/quotes`
- `GET /api/v1/market/status`
- `GET /api/v1/market/providers/health`
- `GET/POST /api/v1/fx/usd-thb|sync`
- `GET /api/v1/system/status`

## Database
Alembic migrations are applied automatically by the backend container with `alembic upgrade head`.
Current migration head: `0009_watch_price_alerts`.

## Testing
Backend:
```bash
docker-compose exec backend pytest -q
```
Worker:
```bash
docker-compose exec worker pytest -q
```
E2E smoke:
```bash
./scripts/test_e2e.sh
```
Frontend build:
```bash
docker-compose build frontend
docker-compose up -d --no-deps frontend
```

## Documentation
- [01 Project Plan](docs/01_PROJECT_PLAN.md)
- [02 Requirements](docs/02_REQUIREMENTS.md)
- [03 System Architecture](docs/03_SYSTEM_ARCHITECTURE.md)
- [04 Database Architecture](docs/04_DATABASE_ARCHITECTURE.md)
- [05 API Architecture](docs/05_API_ARCHITECTURE.md)
- [06 Frontend Architecture](docs/06_FRONTEND_ARCHITECTURE.md)
- [07 Alert Architecture](docs/07_ALERT_ARCHITECTURE.md)
- [08 LINE Notification](docs/08_LINE_NOTIFICATION.md)
- [09 Market Data](docs/09_MARKET_DATA.md)
- [10 Security](docs/10_SECURITY.md)
- [11 Deployment](docs/11_DEPLOYMENT.md)
- [12 Implementation Plan](docs/12_IMPLEMENTATION_PLAN.md)
- [13 UI Style Guide](docs/13_UI_STYLE_GUIDE.md)
- [14 Operations Runbook](docs/14_OPERATIONS_RUNBOOK.md)
- [15 Git & Release Workflow](docs/15_GIT_RELEASE_WORKFLOW.md)
- [16 Data Flow](docs/16_DATA_FLOW.md)
- [Phase 6 Testing](docs/PHASE_6_TESTING.md)
- [Phase 6 Test Report](docs/PHASE_6_TEST_REPORT.md)
- [Phase 7 Hardening](docs/PHASE_7_HARDENING.md)
- [Project Review](docs/PROJECT_REVIEW.md)
