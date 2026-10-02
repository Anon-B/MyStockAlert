# System Architecture

## Architecture Style
Use a modular monolith with a dedicated background worker.

## Flow
Browser -> Next.js -> FastAPI -> PostgreSQL
                           |
                           +-> Background Worker
                                 |- Market Data
                                 |- Alert Engine
                                 |- Scheduler
                                 |- LINE Notification

## Components
### Frontend
Next.js + TypeScript + Tailwind CSS.

### Backend
Python + FastAPI. The API is the application's business boundary.

### Database
PostgreSQL stores users, holdings, watchlists, rules, settings, sessions, and history.

### Worker
Runs scheduled jobs, collects market data, evaluates alerts, sends LINE notifications, and records delivery results.

### Market Data Adapter
Hides provider-specific APIs behind a stable internal interface.

### Notification Adapter
Provides LINE delivery without coupling alert logic to LINE implementation details.

## Docker Services
- frontend
- backend
- worker
- postgres

## Important Rule
The frontend must not call market-data providers directly. All provider access goes through the backend/worker architecture.
