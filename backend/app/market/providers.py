from dataclasses import dataclass
from datetime import datetime, timezone
import httpx

@dataclass
class Quote:
    market: str
    symbol: str
    price: float
    currency: str
    change_percent: float | None
    timestamp: datetime
    source: str

class MarketDataProvider:
    async def quote(self, market: str, symbol: str) -> Quote:
        raise NotImplementedError

class YahooProvider(MarketDataProvider):
    base = "https://query1.finance.yahoo.com/v8/finance/chart/"

    async def quote(self, market: str, symbol: str) -> Quote:
        ticker = f"{symbol}.BK" if market == "TH" else symbol
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(self.base + ticker, params={"range":"1d", "interval":"1m"})
            r.raise_for_status()
            data = r.json()["chart"]["result"][0]
        meta = data["meta"]
        price = float(meta["regularMarketPrice"])
        previous = meta.get("previousClose")
        change = ((price / float(previous)) - 1) * 100 if previous else None
        return Quote(market, symbol, price, "THB" if market == "TH" else "USD", change, datetime.now(timezone.utc), "yahoo")
