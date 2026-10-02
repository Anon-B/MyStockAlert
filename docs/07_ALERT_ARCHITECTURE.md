# Alert Architecture

## Alert Types
- PORTFOLIO_MARKET_OPEN
- PORTFOLIO_MARKET_CLOSE
- PRICE_UP_THRESHOLD
- PRICE_DOWN_THRESHOLD
- SYSTEM_ERROR

## Portfolio P/L
P/L% = (current price - average cost) / average cost * 100

Quantity changes the P/L amount, not the percentage.

## Watchlist Threshold
V1 uses the previous official trading-day close as the reference price.

Example:
- Previous close = 100
- Upper threshold = +5%
- Trigger price = 105

## Anti-Spam
Alert only when a threshold is crossed.
Do not repeat while price remains beyond the threshold.
Allow a new alert after the price resets across the threshold.

## Worker Flow
1. Load enabled markets and symbols
2. Determine market session
3. Fetch current prices
4. Evaluate alert rules
5. Create alert event
6. Apply duplicate prevention
7. Send LINE
8. Record delivery result

Failed LINE deliveries remain recorded for retry.


## Phase 4 Implementation
- Alert engine: `backend/app/alerts.py`.
- Worker flow now fetches quotes and calls `POST /api/v1/alerts/evaluate` every polling cycle.
- Watchlist thresholds use the provider quote `change_percent`, which is based on the previous close.
- Each rule stores independent `upper_armed` and `lower_armed` state.
- Upper alert triggers at or above the upper threshold and disarms until price change returns below it.
- Lower alert triggers at or below the lower threshold and disarms until price change returns above it.
- Portfolio market-open and market-close events are generated once per market/day for each enabled holding.
- Duplicate portfolio session events are prevented by checking the same user, market, alert type, and local trading date.
- Phase 5 will consume pending alert events for LINE delivery and update delivery status.
