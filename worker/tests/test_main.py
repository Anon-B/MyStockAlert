import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))
from app import main

class FakeResponse:
    def __init__(self, payload):
        self.payload = payload
    def raise_for_status(self):
        return None
    def json(self):
        return self.payload

class FakeClient:
    async def __aenter__(self):
        return self
    async def __aexit__(self, *args):
        return False
    async def get(self, url, **kwargs):
        assert url.endswith("/api/v1/internal/market/quotes")
        assert "X-Worker-Token" in kwargs.get("headers", {})
        return FakeResponse([{"symbol": "TESTPH6"}])
    async def post(self, url, **kwargs):
        assert url.endswith("/api/v1/internal/alerts/evaluate")
        assert "X-Worker-Token" in kwargs.get("headers", {})
        return FakeResponse({"created": 2})


def test_poll_market_success(monkeypatch, capsys):
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda timeout: FakeClient())
    asyncio.run(main.poll_market())
    output = capsys.readouterr().out
    assert "quotes=1" in output
    assert "alerts_created=2" in output


def test_poll_market_failure(monkeypatch, capsys):
    class BrokenClient(FakeClient):
        async def get(self, url, **kwargs):
            raise RuntimeError("backend unavailable")
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda timeout: BrokenClient())
    asyncio.run(main.poll_market())
    assert "market poll failed" in capsys.readouterr().out
