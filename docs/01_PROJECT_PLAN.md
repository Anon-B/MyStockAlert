# Project Plan

## Objective
สร้างระบบติดตาม Portfolio หุ้นไทย/สหรัฐ, Watchlist และ Alert แบบ local-first โดยใช้ PostgreSQL เป็น source of truth และแยก UI/API/worker ออกจากกัน

## V1 Scope
- Portfolio holdings และ transaction history
- Watchlist + price/% thresholds
- Dashboard และ market status
- Market quote cache
- Stock Master
- USD/THB FX
- Alert evaluation + outbox state
- Docker Compose deployment
- Automated migrations และ test suite

## Current V1 Status
`v1.0.0` ถูก tag และ push เป็น public repository แล้ว

## Out of Scope / Not Yet Production Ready
- Authentication/authorization จริง
- LINE provider delivery จริง
- Production secrets management
- HA / multi-node deployment
- Real broker order execution
- Full historical price warehouse

## Target Markets
- TH: Asia/Bangkok, session 10:00–12:30 และ 14:30–16:30
- US: America/New_York, session 09:30–16:00
- Calendar มีวันหยุดและ US early-close ที่กำหนดไว้สำหรับปี 2026

## Design Principles
1. PostgreSQL เป็น source of truth
2. Provider failure ไม่ควรทำให้ข้อมูล cache เดิมหาย
3. Alert ต้อง idempotent และ re-arm ได้
4. ข้อมูลพื้นฐานใน UI ต้องสั้น; รายละเอียดค่าใช้จ่ายเปิดแบบ optional
5. Code, migration และ docs ต้องเปลี่ยนไปด้วยกัน

## Main Components
- `frontend/` — Next.js UI
- `backend/` — FastAPI + SQLAlchemy + Alembic
- `worker/` — APScheduler polling/evaluation
- `database/` — database-related assets
- `scripts/` — smoke/restart utilities
- `docs/` — architecture/operation/release documentation

## V1 Success Criteria
- Docker services start successfully
- migrations reach head
- API health returns OK
- frontend returns HTTP 200
- backend/worker tests pass
- E2E smoke flow passes
- release branch/tag is reproducible
