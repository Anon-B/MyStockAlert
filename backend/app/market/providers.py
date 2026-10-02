from dataclasses import dataclass
from datetime import datetime, timezone
import asyncio
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

    def __init__(self, timeout: float = 5.0, retries: int = 2):
        self.timeout = timeout
        self.retries = retries

    async def quote(self, market: str, symbol: str) -> Quote:
        ticker = f"{symbol}.BK" if market == "TH" else symbol
        last_error = None
        for attempt in range(self.retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    r = await client.get(self.base + ticker, params={"range":"1d", "interval":"1m"})
                    if getattr(r, "status_code", None) == 429:
                        raise httpx.HTTPStatusError("provider rate limited", request=getattr(r, "request", None), response=r)
                    r.raise_for_status()
                    data = r.json()["chart"]["result"][0]
                meta = data["meta"]
                price = float(meta["regularMarketPrice"])
                previous = meta.get("previousClose")
                change = ((price / float(previous)) - 1) * 100 if previous else None
                return Quote(market, symbol, price, "THB" if market == "TH" else "USD",
                    change, datetime.now(timezone.utc), "yahoo")
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
                last_error = exc
                if attempt < self.retries:
                    await asyncio.sleep(0.25 * (2 ** attempt))
        raise RuntimeError(f"market provider failed after retries: {last_error}")
