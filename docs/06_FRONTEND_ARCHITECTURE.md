# Frontend Architecture

## Stack
- Next.js 15.5.27
- React 19.1.1
- TypeScript 5.9.2
- single `frontend/app/page.tsx` application shell
- `frontend/styles/theme.css` visual system

## Pages / Sections
### Dashboard
- 4 summary cards
- Portfolio แยก market cards: หุ้นไทย / หุ้นสหรัฐ
- current price + P/L
- Watchlist summary
- market status + FX mini card

### Portfolio
- เพิ่ม/แก้ไข/ลบ holding
- UI market card ใช้ visual language เดียวกับ Dashboard
- transaction history
- BUY/SELL
- optional fees panel

### Watchlist
- CRUD
- upper/lower %
- upper/lower price
- inline edit/delete

### Alert History
แสดง triggered time, market, symbol, type, change, status, retries.

### Settings
- notification toggles
- refresh interval
- display currency
- Stock Master status/sync
- FX status/sync
- data lookup flow

### System Status
แสดง overall status และแยก service:
- Database
- Quote Cache
- Alert Delivery
- Thailand Market Data
- US Market Data

## UX Rules
- Thai-first labels with English technical terms in parentheses where useful
- compact data tables
- market separation reduces redundant columns
- destructive actions require confirmation
- stale quotes are visibly marked
- optional transaction fees remain collapsed by default

## Data Loading
Initial page load fetches portfolio, watchlist, alerts, settings, quotes, summary, system status, market status, provider health, stock status และ FX in parallel.

## Theme
รองรับ Light Glass และ Dark Premium toggle.
