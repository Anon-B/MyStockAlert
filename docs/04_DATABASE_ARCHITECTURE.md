# Database Architecture

## Tables

### users
- id
- username
- password_hash
- created_at
- updated_at

### portfolio_holdings
- id
- user_id
- market
- symbol
- quantity
- average_cost
- currency
- enabled
- created_at
- updated_at

### watchlist_items
- id
- user_id
- market
- symbol
- enabled
- created_at
- updated_at

### alert_rules
- id
- watchlist_item_id
- upper_percent
- lower_percent
- enabled
- created_at
- updated_at

### alert_history
- id
- user_id
- symbol
- market
- alert_type
- reference_price
- trigger_price
- change_percent
- message
- sent_at
- status

### market_sessions
- id
- market
- session_date
- timezone
- open_at
- close_at
- is_trading_day

### settings
- id
- user_id
- key
- value_encrypted_or_json
- updated_at

## Database Rules
- UUID primary keys
- NUMERIC for financial values
- UTC timestamps
- Market timezone for session calculations
- Index frequently queried fields
- Prevent duplicate active watchlist entries for the same user/market/symbol
