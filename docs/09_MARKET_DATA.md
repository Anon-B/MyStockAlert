# Market Data

## Providers
### Yahoo Finance
ใช้สำหรับ:
- quote
- symbol search
- Stock Master sync
- primary FX source

### Frankfurter
ใช้เป็น FX fallback เมื่อ Yahoo FX request ล้มเหลว.

## Quote Flow
```text
Portfolio + Watchlist
      |
      v
YahooProvider
      |
  success -> MarketQuote
  failure -> existing MarketQuote (if available)
```

## Quote Freshness
Quote ถูก mark `stale=true` เมื่อ `quoted_at` เก่ากว่า 300 วินาที.

## Search Flow
```text
query
 -> StockMaster DB
 -> found: return DB
 -> not found: Yahoo search
 -> save/update StockMaster
 -> return results
```

## Stock Master Sync
Sync จะรวม symbols ที่อยู่ใน StockMaster และ symbols ที่ tracked ใน Portfolio/Watchlist แล้ว refresh metadata จาก Yahoo.

## FX Flow
```text
Yahoo USD/THB
   |
 failure
   v
Frankfurter
   |
   v
fx_rates
   |
   +--> Dashboard / Portfolio / Settings
```

## Market Rules
- TH timezone `Asia/Bangkok`
- US timezone `America/New_York`
- Calendar configuration อยู่ใน `backend/app/market/calendar.py`
- วันหยุดชุดปัจจุบันครอบคลุมปี 2026

## Resilience
- quote timeout
- retry with exponential backoff
- cached quote fallback
- provider health endpoint

## Limitations
External provider availability/rate limits ยังเป็น dependency ภายนอก. ไม่ควรถือ provider response เป็น historical market database.
