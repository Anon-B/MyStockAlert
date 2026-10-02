# Market Data

## Requirements
The provider must support reliable Thai and US equity price data.

## Adapter Interface
- get_quote(symbol, market)
- get_quotes(symbols, market)
- get_market_status(market)
- get_trading_calendar(market)

## Required Data
- Current/last price
- Previous close
- Session status
- Trading calendar

## Market Rules
- Handle US daylight-saving changes
- Handle market holidays
- Distinguish regular session from pre/post market
- Respect provider rate limits
- Detect stale or missing prices
- Consider provider licensing and usage limits

## V1
Use regular-session prices by default.
Extended-hours support can be added later.


## Phase 3 Implementation
- Provider adapter: `backend/app/market/providers.py`.
- Yahoo Chart API is used as the initial provider; TH symbols are mapped to `.BK`.
- Quotes are cached in PostgreSQL table `market_quotes`.
- API: `GET /api/v1/market/status` and `GET /api/v1/market/quotes`.
- Quote data is marked stale when the cached quote is older than 5 minutes.
- TH timezone: Asia/Bangkok. US timezone: America/New_York.
- Worker polls the market endpoint every 60 seconds by default.

## Important Limitations
- Phase 3 calendar logic currently handles weekdays and timezone/session windows; exchange holiday feeds are not yet provider-backed.
- Extended-hours prices are not used for V1.
- Provider availability, rate limits, licensing, and symbol coverage must be validated before production use.
- If a fresh provider response fails, the last cached quote is retained and exposed as stale.
