# Alert Architecture

## Alert Types
- `watchlist_upper`
- `watchlist_lower`
- `portfolio_open_TH`
- `portfolio_close_TH`
- `portfolio_open_US`
- `portfolio_close_US`

## Watchlist Evaluation
1. โหลด enabled watchlist
2. โหลด enabled alert rule
3. อ่าน cached quote
4. ตรวจ price และ change percentage
5. ตรวจ armed state
6. trigger เมื่อ threshold ถูกแตะ
7. ปิด armed state ด้านที่ trigger
8. สร้าง `AlertHistory`
9. สร้าง `AlertOutbox`

## Re-arm
Upper re-arms เมื่อ price/change กลับต่ำกว่า upper threshold.  
Lower re-arms เมื่อ price/change กลับสูงกว่า lower threshold.

## Anti-Spam / Idempotency
- `idempotency_key` เป็น unique
- watchlist key มี user/item/type/date/hour/minute
- portfolio session ตรวจ existing alert ในวันเดียวกันก่อนสร้างซ้ำ

## Portfolio Session
Trading calendar เป็นตัวกำหนดวันทำการและ session. เมื่อถึง open/close จะสร้าง alert ต่อ holding ที่มี quote.

## Delivery Model
Alert ถูกสร้างเป็น `pending` และมี `AlertOutbox(channel=line)` เพื่อรองรับ delivery worker/provider ในอนาคต. ปัจจุบัน LINE delivery จริงยังไม่เปิดใช้งาน.

## Worker Flow
```text
Timer
 -> market quotes
 -> PostgreSQL cache
 -> evaluate alerts
 -> AlertHistory
 -> AlertOutbox
```

## Important Limitation
Worker ปัจจุบัน evaluate alert แต่ยังไม่มี sender จริงสำหรับ `AlertOutbox`.
