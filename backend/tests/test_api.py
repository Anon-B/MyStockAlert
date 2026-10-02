from conftest import cleanup_user_data


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_portfolio_crud(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    payload = {"market": "TH", "symbol": "TESTPH6", "quantity": 10, "average_cost": 100, "currency": "THB"}
    created = client.post("/api/v1/portfolio", json=payload)
    assert created.status_code == 201
    item_id = created.json()["id"]
    updated = client.put(f"/api/v1/portfolio/{item_id}", json={**payload, "quantity": 20})
    assert updated.status_code == 200
    assert updated.json()["quantity"] == "20.00000000"
    assert client.delete(f"/api/v1/portfolio/{item_id}").status_code == 204


def test_watchlist_duplicate_and_settings(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    payload = {"market": "US", "symbol": "TESTPH6", "upper_percent": 5, "lower_percent": -5}
    assert client.post("/api/v1/watchlist", json=payload).status_code == 201
    duplicate = client.post("/api/v1/watchlist", json=payload)
    assert duplicate.status_code == 409
    setting = client.put("/api/v1/settings/phase6_test", json={"value": True})
    assert setting.status_code == 200
    assert client.get("/api/v1/settings").status_code == 200
    cleanup_user_data(db, demo_user.id)


def test_market_status_and_empty_quotes(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    status = client.get("/api/v1/market/status")
    assert status.status_code == 200
    assert {x["market"] for x in status.json()} == {"TH", "US"}
    quotes = client.get("/api/v1/market/quotes")
    assert quotes.status_code == 200
    assert quotes.json() == []
