from datetime import datetime, timezone
from decimal import Decimal
import uuid

from app import main
from app.market.providers import Quote
from app.models import MarketQuote, PortfolioHolding, WatchlistItem
from conftest import cleanup_user_data


class FakeProvider:
    def __init__(self, fail=False):
        self.fail = fail

    async def quote(self, market, symbol):
        if self.fail:
            raise RuntimeError("mock provider failure")
        return Quote(market, symbol, 123.45, "THB" if market == "TH" else "USD", 2.5,
                          datetime.now(timezone.utc), "mock")


def test_market_status_fixed_weekday(client):
    result = main.market_status_api()
    assert {x["market"] for x in result} == {"TH", "US"}


def test_quotes_fetch_and_cache(client, demo_user, db, monkeypatch):
    cleanup_user_data(db, demo_user.id)
    symbol = "M" + uuid.uuid4().hex[:7].upper()
    row = PortfolioHolding(user_id=demo_user.id, market="TH", symbol=symbol,
                           quantity=1, average_cost=100, currency="THB", enabled=True)
    db.add(row)
    db.commit()
    monkeypatch.setattr(main, "YahooProvider", lambda: FakeProvider())
    first = client.get("/api/v1/market/quotes")
    assert first.status_code == 200
    assert first.json()[0]["source"] == "mock"
    assert first.json()[0]["stale"] is False
    monkeypatch.setattr(main, "YahooProvider", lambda: FakeProvider(fail=True))
    cached = client.get("/api/v1/market/quotes")
    assert cached.status_code == 200
    assert cached.json()[0]["price"] == "123.45000000"
    assert cached.json()[0]["source"] == "mock"
    cleanup_user_data(db, demo_user.id)
    db.query(MarketQuote).filter(MarketQuote.symbol == symbol).delete()
    db.commit()


def test_quotes_skip_missing_cache_on_provider_failure(client, demo_user, db, monkeypatch):
    cleanup_user_data(db, demo_user.id)
    symbol = "N" + uuid.uuid4().hex[:7].upper()
    db.add(WatchlistItem(user_id=demo_user.id, market="US", symbol=symbol, enabled=True))
    db.commit()
    monkeypatch.setattr(main, "YahooProvider", lambda: FakeProvider(fail=True))
    response = client.get("/api/v1/market/quotes")
    assert response.status_code == 200
    assert response.json() == []
    cleanup_user_data(db, demo_user.id)
