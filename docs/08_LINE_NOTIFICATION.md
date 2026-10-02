# LINE Notification

## Role
LINE เป็นช่องทาง delivery ที่ออกแบบไว้สำหรับ AlertOutbox แต่ยังไม่เปิดเป็น production provider ใน v1.0.0.

## Planned Notification Types
- Watchlist upper/lower
- TH market open/close
- US market open/close

## Current State
ระบบสร้าง `AlertHistory` และ `AlertOutbox(channel="line")` ได้ แต่ไม่มี credential/config และ sender service จริงใน repository ปัจจุบัน.

## Security Requirements
เมื่อเพิ่ม LINE provider:
- token/secret ต้องอยู่ใน environment/secret manager
- ห้ามเก็บ token ใน Git
- retry ต้องมี backoff และ max attempts
- delivery result ต้องอัปเดต `sent_at`, `delivered_at`, `last_error`, `retry_count`

## Message Content
ควรมีอย่างน้อย market, symbol, trigger type, price/change และ timestamp.

## Implementation Order
1. provider interface
2. secure credentials
3. sender worker
4. retry/backoff
5. delivery status
6. integration tests
7. opt-in per user
