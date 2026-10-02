# Database Architecture

## Migration Chain
```text
0001_initial
 -> 0002_market_quotes
 -> 0003_alert_state
 -> 0004_hardening
 -> 0005_timestamp_triggers
 -> 0006_portfolio_transactions
 -> 0007_stock_master
 -> 0008_fx_rates
 -> 0009_watch_price_alerts
```

## Tables
### users
Identity placeholder; current application resolves the seeded `demo` user.

### portfolio_holdings
`market, symbol, quantity, average_cost, currency, enabled` และ timestamps.

### portfolio_transactions
BUY/SELL, order ID, quantity, execution price, trading value, optional fee fields, FX rate, net amount, executed time.

### watchlist_items
User-owned market/symbol tracking rows.

### alert_rules
One rule per watchlist item; percentage/price thresholds, enabled, armed state และ last trigger.

### alert_history
Trigger record + reference/trigger price, change %, message, delivery timestamps, retry count, last error, idempotency key, status.

### alert_outbox
Delivery queue abstraction with channel, status, attempts, next attempt time and last error.

### settings
Per-user key/value JSONB settings.

### stock_master
Market symbol master: name, exchange, currency, active, source, synced time.

### market_quotes
Latest quote cache per market/symbol.

### fx_rates
USD/THB rate with source and quoted time.

## Data Rules
- UUID primary keys
- user-owned tables use foreign keys with cascade
- symbols normalized uppercase
- market จำกัด `TH` / `US` ใน API normalization
- quote freshness derived from `quoted_at`
- alert idempotency key unique

## Backup
Production backup policyยังต้องกำหนดก่อนใช้งานจริง. Local Docker volume คือ `postgres_data`.
