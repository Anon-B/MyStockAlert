# Requirements

## Portfolio
- เพิ่ม/แก้ไข/ลบ holding
- แยก TH/US และ currency
- แสดง quantity, average cost และ current quote
- คำนวณ cost basis / current value / P&L เมื่อมี quote
- เปิด transaction panel เพื่อบันทึก BUY/SELL
- รองรับ Order ID, executed time และ FX rate
- ค่าใช้จ่ายจริงเป็น optional section

## Transaction Fees
TH supports: commission, SET trading fee, TSD clearing fee, regulatory fee, VAT.  
US supports: commission, CAT, SEC, TAF, VAT/tax field.

Net amount:
- BUY = trading value + fees
- SELL = trading value - fees

## Watchlist
- Symbol + market
- Upper/Lower percentage
- Upper/Lower price
- enabled state
- ป้องกัน duplicate ต่อ user + market + symbol

## Alerts
- Watchlist upper/lower
- Portfolio market open/close
- Re-arm หลังราคา/percentage กลับผ่าน threshold
- Idempotency key ป้องกันการสร้างซ้ำ
- Alert history ต้องเก็บ retry/error/delivery state

## Settings
Current UI settings:
- notifications enabled
- alert on market open
- alert on market close
- refresh interval: 15/30/60 seconds
- display currency: native/THB/USD
- Stock Master sync
- USD/THB FX sync

## Market Data
- Yahoo Finance เป็น primary quote/search provider
- Quote cache เก็บใน PostgreSQL
- Quote stale เมื่อเก่ากว่า 5 นาที
- Stock Master เก็บ symbol/name/exchange/currency/source/sync time
- FX มี Yahoo primary และ Frankfurter fallback

## Non-Functional Requirements
- Dockerized
- migration-driven database
- provider timeout/retry
- safe fallback to cached data
- deterministic alert logic
- tests for API, calendar, provider, alert และ worker
- secrets ไม่อยู่ใน repository

## Security Requirement Before Production
ต้องเพิ่ม authentication/authorization จริง และแยก user data ตาม identity จริงก่อนเปิดใช้งานหลายผู้ใช้
