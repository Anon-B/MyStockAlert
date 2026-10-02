# Project Plan

## Objective
MyStockAlert is a personal web application for monitoring Thai and US stocks, portfolio holdings, watchlists, profit/loss, and LINE notifications.

## V1 Scope
- Portfolio CRUD
- Watchlist CRUD
- Per-stock upper/lower percentage alerts
- Portfolio performance
- Market-open and market-close summaries
- Price threshold alerts
- Alert history
- LINE settings and test notification
- System settings
- Dashboard

## Out of Scope
- Automatic order execution
- Broker integration
- AI trading decisions
- Technical-indicator trading signals
- News sentiment
- Options, futures, crypto

## Target Markets
- Thailand: SET
- United States: US equities

## Design Principles
- Simple and maintainable
- Web UI for configuration
- Background worker independent of browser
- Market timezone/calendar aware
- Duplicate-alert prevention
- Market-data provider adapter
## Main Components
- Next.js frontend
- FastAPI backend
- PostgreSQL
- Background worker
- Market-data adapter
- LINE notification adapter

## V1 Success Criteria
The user can manage holdings and watchlists, configure thresholds, see P/L, receive scheduled and threshold alerts, and review alert history without manual database edits.
