# MyStockAlert — Personal/Small-Team Improvement Plan

## Scope
ระบบนี้เป็น Private Internal Tool สำหรับใช้งานส่วนตัวและทีม 2–3 คน ไม่ได้มีเป้าหมายรองรับ Public/SaaS

## Guiding Principles
1. ความถูกต้องของข้อมูลหุ้นสำคัญกว่าฟีเจอร์จำนวนมาก
2. Quote → Watchlist → Portfolio → Alert ต้องเชื่อถือได้
3. ข้อมูลต้องไม่หาย: backup/restore มีความสำคัญสูง
4. UX ต้องชัดเจน แต่ไม่ทำ Enterprise over-engineering
5. จบทุก Phase ต้องทำ test จริงก่อนถือว่า Phase complete
6. ไม่ล้างข้อมูลทดสอบระหว่างการพัฒนา/QA

## Priority

### P0 — Phase 1: Core Reliability
- Quote TH + US ถูกต้อง
- Watchlist แสดง current price จริง
- Quote freshness: Live / Delayed / Last Updated
- Portfolio valuation / P&L ถูกต้อง
- Alert evaluation / re-arm / idempotency ถูกต้อง
- USD/THB FX และ fallback ถูกต้อง
- API/provider error handling
- Form validation แบบ inline
- ป้องกัน duplicate submit

### P0 — Phase 2: Data Safety
- Database backup
- Backup rotation
- Restore test
- Export portfolio/transactions

### P1 — Phase 3: UX
- Inline validation / toast แทน native alert
- Loading / empty / error states
- Transaction confirmation
- Responsive desktop/tablet
- Keyboard/modal usability

### P2 — Phase 4: Team Features
- Basic USER/ADMIN ถ้าจำเป็น
- Basic user management
- Basic password reset/session handling

### P3 / Out of Scope
- Public user management
- Multi-tenant
- Enterprise RBAC
- SSO / OAuth / MFA
- Enterprise audit log
- Mobile application

## Current Execution Status
Improvement Phase 1 implementation is complete.
QA status: CONDITIONAL PASS.
Outstanding: browser click-level re-test of the newly changed inline-validation controls.

## Phase Completion Gate
ทุก Phase ต้องผ่าน:
1. Automated tests
2. Build/lint/type check
3. API integration tests
4. E2E/manual browser test ตาม scope
5. Edge/error/security tests ที่เกี่ยวข้อง
6. บันทึกผลลง `logs/PHASE_<N>_TEST_*.log`
7. สรุป PASS / CONDITIONAL PASS / FAIL ก่อนเริ่ม Phase ถัดไป

## Phase 1 Test Matrix
- Quote TH
- Quote US
- Watchlist current price
- Quote stale/freshness
- Portfolio valuation and P&L
- Alert trigger
- Alert idempotency under concurrent evaluation
- Alert re-arm
- FX primary/fallback
- Provider failure/cache preservation
- Transaction validation
- Duplicate transaction submit/idempotency
- Crash/retry behavior
- Timezone/DST market session logic
- Auth/security E2E
- Frontend build + typecheck
- Browser happy/invalid/edge flows
