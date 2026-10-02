# Data Flow

## Page Load
```text
Browser
 -> parallel API requests
 -> PostgreSQL / provider-backed endpoints
 -> UI state
```

The frontend loads portfolio, watchlist, alert history, settings, quotes, portfolio summary, system status, market status, provider health, Stock Master status and FX in parallel.

## Portfolio
```text
User input
 -> POST /portfolio
 -> portfolio_holdings
 -> Dashboard / Portfolio
```

Transaction:
```text
BUY/SELL form
 -> POST /portfolio/{id}/transactions
 -> calculate trading_value + fees
 -> portfolio_transactions
 -> transaction history
```

## Watchlist
```text
User input
 -> POST/PUT /watchlist
 -> watchlist_items + alert_rules
```

## Quote
```text
Worker / UI request
 -> /market/quotes
 -> YahooProvider
 -> success: market_quotes upsert
 -> failure: existing market_quotes if available
 -> frontend
```

## Alert
```text
MarketQuote
 -> evaluate_alerts
 -> threshold/session logic
 -> AlertHistory
 -> AlertOutbox
```

## Stock Search
```text
Search
 -> StockMaster
 -> hit: return local data
 -> miss: Yahoo search
 -> upsert StockMaster
 -> return
```

## FX
```text
Sync
 -> Yahoo FX
 -> fallback Frankfurter
 -> fx_rates
 -> Dashboard / Portfolio / Settings
```

## Worker Schedule
Default every 60 seconds:
```text
poll_market
  -> GET market/quotes
  -> POST alerts/evaluate
```

## Source of Truth
- holdings/transactions/watchlist/alerts/settings: PostgreSQL
- latest quote: PostgreSQL cache populated from provider
- stock metadata: PostgreSQL StockMaster refreshed from provider
- FX: PostgreSQL fx_rates refreshed from provider
