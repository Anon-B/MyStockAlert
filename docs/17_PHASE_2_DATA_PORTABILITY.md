# Phase 2 — Data Portability

## Scope
สำหรับ MyStockAlert แบบ Personal / Small Team เน้นการย้ายและตรวจสอบข้อมูลผ่าน Excel โดย **ไม่ทำ Database Backup / Rotation / Restore** ใน Phase นี้

## สิ่งที่ทำ
- Export Portfolio → Excel
- Export Transactions → Excel
- Portfolio Excel Template
- Transactions Excel Template
- Import Portfolio พร้อม Preview / Validation
- Import Transactions พร้อม Preview / Validation
- Duplicate protection ด้วย `external_id`
- Import result: Imported / Skipped / Failed
- Error Report จากหน้าจอเป็น CSV เมื่อ validation ไม่ผ่าน

## Data ownership
- **Transactions = source of truth** สำหรับประวัติการซื้อขาย
- Portfolio เป็น position/snapshot ที่นำไปใช้เริ่มต้นระบบหรือแก้ไข position โดยตรง
- `current_price`, `market_value`, `unrealized_pnl` เป็นค่าคำนวณจากระบบ ไม่ใช้เป็น import source

## Import Flow
```text
Select Excel
   ↓
Upload
   ↓
Parse
   ↓
Validate
   ↓
Preview
   ├─ Error → Error Report
   └─ Pass → Confirm Import
                  ↓
                Import DB
                  ↓
        Imported / Skipped / Failed
```

## Transaction columns
`external_id | transaction_date | symbol | market | side | quantity | price | currency | fee | tax | note`

Required: `external_id`, `transaction_date`, `symbol`, `market`, `side`, `quantity`, `price`, `currency`.

`external_id` ต้องไม่ซ้ำในข้อมูลของ user เดียวกัน และการนำเข้าไฟล์เดิมซ้ำจะถูก **Skipped** แทนการสร้าง transaction ซ้ำ

## Portfolio columns
Import ใช้เฉพาะ:
`symbol | market | quantity | avg_cost | currency`

Export เพิ่มค่าที่ระบบคำนวณได้:
`name | current_price | market_value | unrealized_pnl`

ค่าที่คำนวณได้ไม่ถูกนำกลับมาใช้เป็น source ใน Portfolio Import

## Validation
- Market: `TH` / `US`
- Side: `BUY` / `SELL`
- Currency: `THB` / `USD`
- Quantity / Price > 0
- Fee / Tax ไม่ติดลบ
- Date/time ต้องถูกต้อง
- Duplicate `external_id` ในไฟล์เดียวกัน → Error
- `external_id` ที่เคย import แล้ว → Warning + Skip

## API
- `GET /api/v1/data/export/portfolio`
- `GET /api/v1/data/export/transactions`
- `GET /api/v1/data/template/portfolio`
- `GET /api/v1/data/template/transactions`
- `POST /api/v1/data/import/portfolio/preview`
- `POST /api/v1/data/import/portfolio`
- `POST /api/v1/data/import/transactions/preview`
- `POST /api/v1/data/import/transactions`
