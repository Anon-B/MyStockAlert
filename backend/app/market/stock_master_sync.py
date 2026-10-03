from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import StockMaster

URL = "https://query2.finance.yahoo.com/v1/finance/screener"
HEADERS = {"User-Agent": "Mozilla/5.0"}
MARKETS = {
    "US": ("us", ["ASE","BTS","CXI","NAE","NCM","NGM","NMS","NYQ","OEM","OQB","OQX","PCX","PNK","YHD"], "USD"),
    "TH": ("th", ["SET"], "THB"),
}

async def _fetch(region, exchanges):
    offset, rows = 0, []
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS) as client:
        while True:
            body = {"query":{"operator":"and","operands":[
                {"operator":"eq","operands":["region",region]},
                {"operator":"eq","operands":["quoteType","EQUITY"]},
                {"operator":"is-in","operands":["exchange",exchanges]},
            ]},"offset":offset,"size":250,"sortField":"ticker","sortType":"ASC"}
            r = await client.post(URL, params={"corsDomain":"finance.yahoo.com","formatted":"false","lang":"en-US"}, json=body)
            r.raise_for_status()
            result = r.json()["finance"]["result"][0]
            batch = result.get("quotes", [])
            total = int(result.get("total", len(batch)))
            rows.extend(batch)
            if not batch or len(rows) >= total:
                return rows
            offset += len(batch)

async def sync_all_stocks(db: Session):
    now = datetime.now(timezone.utc)
    added = updated = total = 0
    for market, (region, exchanges, currency) in MARKETS.items():
        quotes = await _fetch(region, exchanges)
        seen = set()
        for item in quotes:
            symbol = str(item.get("symbol","")).strip()
            if not symbol or symbol in seen:
                continue
            seen.add(symbol)
            row = db.scalar(select(StockMaster).where(StockMaster.market == market, StockMaster.symbol == symbol))
            name = item.get("longName") or item.get("shortName") or symbol
            exchange = item.get("exchange")
            if row is None:
                db.add(StockMaster(market=market, symbol=symbol, name=name, exchange=exchange, currency=currency, active=True, source="yahoo", synced_at=now))
                added += 1
            else:
                row.name, row.exchange, row.currency = name, exchange, currency
                row.active, row.source, row.synced_at = True, "yahoo", now
                updated += 1
            total += 1
        db.commit()
    return {"total": total, "added": added, "updated": updated, "synced_at": now.isoformat()}
