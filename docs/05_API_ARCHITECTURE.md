# API Architecture

## Base Path
/api/v1

## Portfolio
- GET /portfolio
- POST /portfolio
- GET /portfolio/{id}
- PATCH /portfolio/{id}
- DELETE /portfolio/{id}

## Watchlist
- GET /watchlist
- POST /watchlist
- GET /watchlist/{id}
- PATCH /watchlist/{id}
- DELETE /watchlist/{id}

## Alert Rules
- GET /watchlist/{id}/alert-rule
- PUT /watchlist/{id}/alert-rule

## Alerts
- GET /alerts
- POST /alerts/test

## Settings
- GET /settings
- PATCH /settings
- POST /settings/line/test

## Market
- GET /market/quote
- GET /market/status

## System
- GET /health

## API Rules
- Validate all input
- Never return secrets
- Use explicit error responses
- Make updates idempotent where practical
- Keep provider-specific response formats out of frontend contracts
