import asyncio
import httpx
import pytest
from app.market.providers import YahooProvider


def test_yahoo_provider_th_mapping(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None
        def json(self):
            return {"chart": {"result": [{"meta": {
                "regularMarketPrice": 110,
                "previousClose": 100,
            }}]}}

    class Client:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, params, **kwargs):
            assert url.endswith("/ABC.BK")
            assert params["interval"] == "1m"
            return Response()

    monkeypatch.setattr(httpx, "AsyncClient", lambda timeout: Client())
    quote = asyncio.run(YahooProvider().quote("TH", "ABC"))
    assert quote.symbol == "ABC"
    assert quote.currency == "THB"
    assert quote.change_percent == pytest.approx(10.0)


def test_yahoo_provider_us_mapping(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None
        def json(self):
            return {"chart": {"result": [{"meta": {
                "regularMarketPrice": 200,
                "previousClose": 200,
            }}]}}

    class Client:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, params, **kwargs):
            assert url.endswith("/AAPL")
            return Response()

    monkeypatch.setattr(httpx, "AsyncClient", lambda timeout: Client())
    quote = asyncio.run(YahooProvider().quote("US", "AAPL"))
    assert quote.currency == "USD"
    assert quote.change_percent == pytest.approx(0.0)
