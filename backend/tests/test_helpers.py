import pytest
from fastapi import HTTPException
from app import main


def test_health_endpoints(client):
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/api/v1/health").json()["service"] == "backend"


def test_normalize_market_symbol():
    assert main.normalize_market_symbol(" th ", " abc ") == ("TH", "ABC")
    with pytest.raises(HTTPException) as bad_market:
        main.normalize_market_symbol("JP", "ABC")
    assert bad_market.value.status_code == 422
    with pytest.raises(HTTPException) as bad_symbol:
        main.normalize_market_symbol("TH", " ")
    assert bad_symbol.value.status_code == 422


def test_market_status_unknown_market():
    with pytest.raises(KeyError):
        main.market_status_api.__globals__["market_status"]("JP")
