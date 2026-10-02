# API Architecture

## Base
`http://127.0.0.1:8000/api/v1`

## Health
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | process health |
| GET | `/api/v1/health` | API health |

## Portfolio
- `GET/POST /portfolio`
- `PUT/DELETE /portfolio/{id}`
- `GET/POST /portfolio/{id}/transactions`
- `GET /portfolio/summary`

## Watchlist / Alerts
- `GET/POST/PUT/DELETE /watchlist[/{id}]`
- `GET /alerts/history?limit=50`
- `POST /alerts/evaluate`

## Settings
- `GET /settings`
- `PUT /settings/{key}`
- `DELETE /settings/{key}`

## Market
- `GET /market/search?q=...&market=TH|US`
- `GET /market/quotes`
- `GET /market/status`
- `GET /market/providers/health`
- `GET /market/stocks/status`
- `POST /market/stocks/sync`

## FX
- `GET /fx/usd-thb`
- `POST /fx/usd-thb/sync`

## System
- `GET /system/status`

## API Behavior
- Validation errors return 4xx
- missing resources return 404
- duplicate watchlist returns 409
- upstream provider failure may return 502
- current auth is demo-user dependency, not production authentication

## CORS
Local frontend origins allowed:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

ก่อน production ต้องเปลี่ยนเป็น explicit trusted origins และเปิด authentication.
