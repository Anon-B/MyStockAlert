# MyStockAlert

Personal Stock Portfolio & Alert System

## Purpose
- Track Thai and US holdings
- Track watchlist stocks
- Configure per-stock percentage alerts
- Send market-open, market-close, and price alerts to LINE

## Documentation
- [Project Plan](docs/01_PROJECT_PLAN.md)
- [Requirements](docs/02_REQUIREMENTS.md)
- [System Architecture](docs/03_SYSTEM_ARCHITECTURE.md)
- [Database Architecture](docs/04_DATABASE_ARCHITECTURE.md)
- [API Architecture](docs/05_API_ARCHITECTURE.md)
- [Frontend Architecture](docs/06_FRONTEND_ARCHITECTURE.md)
- [Alert Architecture](docs/07_ALERT_ARCHITECTURE.md)
- [LINE Notification](docs/08_LINE_NOTIFICATION.md)
- [Market Data](docs/09_MARKET_DATA.md)
- [Security](docs/10_SECURITY.md)
- [Deployment](docs/11_DEPLOYMENT.md)
- [Implementation Plan](docs/12_IMPLEMENTATION_PLAN.md)

## Phase 0

Foundation is implemented with Docker Compose services for PostgreSQL, FastAPI backend, background worker, and Next.js frontend.

### Start

    docker-compose up -d

### Check

    docker-compose ps
    curl http://127.0.0.1:8000/health

### Stop

    docker-compose down

Execution logs are stored under logs/.
