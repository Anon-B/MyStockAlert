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
