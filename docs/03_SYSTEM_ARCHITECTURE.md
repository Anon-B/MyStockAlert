# System Architecture

## Architecture Style
Local-first, service-oriented Docker Compose architecture.

```text
Browser
  |
  v
Next.js :3000
  |
  v
FastAPI :8000
  +--------------------+
  |                    |
  v                    v
PostgreSQL :5432   External Providers
  ^                Yahoo / Frankfurter
  |
Worker
```

## Services
| Service | Role | Port |
|---|---|---|
| postgres | source of truth | 5432 |
| backend | REST API, business logic, migrations | 8000 |
| worker | scheduled quote polling + alert evaluation | internal |
| frontend | web UI | 3000 |

## Frontend
Next.js 15.5.27 + React 19.1.1 + TypeScript 5.9.2.  
หน้าเดียวสลับ sections: Dashboard, Portfolio, Watchlist, Alert History, Settings, System Status.

## Backend
FastAPI 0.117.1, SQLAlchemy 2.0.43, Alembic 1.16.5.  
API ใช้ demo user resolver ในปัจจุบัน; ยังไม่มี login/session/JWT จริง

## Database
PostgreSQL 17-alpine. Alembic migration head = `0009_watch_price_alerts`.

## Worker
APScheduler interval job เรียก:
1. `GET /api/v1/market/quotes`
2. `POST /api/v1/alerts/evaluate`

Default polling = 60 seconds (`MARKET_POLL_SECONDS`). `max_instances=1`, `coalesce=True`.

## Market Data
`market/providers.py` มี provider abstraction และ Yahoo implementation. Quote failure จะพยายามใช้ cached `MarketQuote` ที่มีอยู่แทนการล้มทั้ง response.

## Important Rule
PostgreSQL เป็น source of truth. External providers เป็น upstream data sources ไม่ใช่ฐานข้อมูลหลัก.
