# Security

## Current Authentication
ยังไม่มี login/JWT/session authentication. API ใช้ seeded `demo` user dependency.

**ดังนั้น v1.0.0 เหมาะกับ local/single-user development มากกว่า production multi-user.**

## Secrets
- `.env` และ `.env.*` ถูก ignore
- `.env.example` ใช้เป็น template
- ห้าม commit DB password, API token, LINE token หรือ secret จริง

## Application Security
- input normalization สำหรับ market/symbol
- SQLAlchemy parameterization
- foreign-key ownership checks
- duplicate prevention
- explicit local CORS origins

## Provider Security
External HTTPS endpoints มี timeout. Provider data ต้องถือเป็น untrusted external input.

## Production Checklist
- authentication + authorization
- per-user data isolation based on authenticated identity
- rotate `APP_SECRET`
- strong DB password
- HTTPS/TLS
- restrictive CORS
- secret manager
- rate limiting
- audit logging
- database backups
- dependency/container scanning

## Data Safety
Transaction และ alert data เป็น financial activity records. ควรมี backup/restore test ก่อน production.
