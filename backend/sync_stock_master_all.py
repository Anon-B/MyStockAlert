import sys
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
sys.path.insert(0, "/app")
from app.db import SessionLocal
from app.models import StockMaster

URL = "https://query2.finance.yahoo.com/v1/finance/screener"
HEADERS = {"User-Agent": "Mozilla/5.0"}
US_EXCHANGES = ["ASE", "BTS", "CXI", "NAE", "NCM", "NGM", "NMS", "NYQ", "OEM", "OQB", "OQX", "PCX", "PNK", "YHD"]
MARKETS = {"US": ("us", US_EXCHANGES, "USD"), "TH": ("th", ["SET"], "THB")}

def fetch_all(region, exchanges):
    offset = 0
    all_quotes = []
    while True:
        body = {"query": {"operator": "and", "operands": [
            {"operator": "eq", "operands": ["region", region]},
            {"operator": "eq", "operands": ["quoteType", "EQUITY"]},
            {"operator": "is-in", "operands": ["exchange", exchanges]},
        ]}, "offset": offset, "size": 250, "sortField": "ticker", "sortType": "ASC"}
        r = httpx.post(URL, params={"corsDomain": "finance.yahoo.com", "formatted": "false", "lang": "en-US", "region": region.upper()}, json=body, headers=HEADERS, timeout=15)
        r.raise_for_status()
        result = r.json()["finance"]["result"][0]
        quotes = result.get("quotes", [])
        total = int(result.get("total", len(quotes)))
        all_quotes.extend(quotes)
        print(f"{region.upper()}: fetched {len(all_quotes)}/{total}", flush=True)
        if not quotes or len(all_quotes) >= total:
            break
        offset += len(quotes)
    return all_quotes

def upsert(db, market, currency, quotes):
    added = updated = 0
    now = datetime.now(timezone.utc)
    seen = set()
    for item in quotes:
        symbol = str(item.get("symbol", "")).strip()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        name = item.get("longName") or item.get("shortName") or symbol
        exchange = item.get("exchange")
        row = db.scalar(select(StockMaster).where(StockMaster.market == market, StockMaster.symbol == symbol))
        if row is None:
            db.add(StockMaster(market=market, symbol=symbol, name=name, exchange=exchange, currency=currency, active=True, source="yahoo", synced_at=now))
            added += 1
        else:
            row.name, row.exchange, row.currency = name, exchange, currency
            row.active, row.source, row.synced_at = True, "yahoo", now
            updated += 1
    db.commit()
    return added, updated, len(seen)

def main():
    db = SessionLocal()
    try:
        total_added = total_updated = total_rows = 0
        for market, (region, exchanges, currency) in MARKETS.items():
            quotes = fetch_all(region, exchanges)
            added, updated, count = upsert(db, market, currency, quotes)
            total_added += added
            total_updated += updated
            total_rows += count
            print(f"{market}: total={count}, added={added}, updated={updated}", flush=True)
        print(f"DONE: total={total_rows}, added={total_added}, updated={total_updated}", flush=True)
    finally:
        db.close()

if __name__ == "__main__":
    main()
