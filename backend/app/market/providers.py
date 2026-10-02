from dataclasses import dataclass
from datetime import datetime, timezone
import asyncio
import httpx

async def search_symbols(query: str, market: str, limit: int = 8) -> list[dict]:
    market = market.upper()
    if market not in {"TH", "US"} or not query.strip():
        return []
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get("https://query2.finance.yahoo.com/v1/finance/search", params={"q": query.strip(), "quotesCount": limit * 2, "newsCount": 0}, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        quotes = r.json().get("quotes", [])
    results = []
    for item in quotes:
        quote_type = item.get("quoteType")
        symbol = str(item.get("symbol", ""))
        if quote_type != "EQUITY":
            continue
        if market == "TH" and not symbol.endswith(".BK"):
            continue
        if market == "US" and (symbol.endswith(".BK") or item.get("exchange") not in {"NMS", "NYQ", "NGM", "NCM", "NMQ", "ASE", "BTS"}):
            continue
        clean = symbol[:-3] if market == "TH" and symbol.endswith(".BK") else symbol
        results.append({"symbol": clean, "name": item.get("longname") or item.get("shortname") or clean, "exchange": item.get("exchange"), "market": market, "currency": "THB" if market == "TH" else "USD"})
        if len(results) >= limit:
            break
    return results

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

async def fx_rate(base: str = "USD", quote: str = "THB") -> tuple[float, datetime, str]:
    ticker = f"{base.upper()}{quote.upper()}=X"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(YahooProvider.base + ticker, params={"range":"1d", "interval":"1m"})
            r.raise_for_status()
            data = r.json()["chart"]["result"][0]["meta"]
        return float(data["regularMarketPrice"]), datetime.now(timezone.utc), "yahoo"
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("https://api.frankfurter.dev/v2/rate/"+base.lower()+"/"+quote.lower())
            r.raise_for_status()
            data = r.json()
        quoted_at = datetime.fromisoformat(data["date"]).replace(tzinfo=timezone.utc)
        return float(data["rate"]), quoted_at, "frankfurter"
