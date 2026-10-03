from conftest import cleanup_user_data


def test_portfolio_validation_and_not_found(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    # Zero is a valid empty holding shell; quantity/price validation belongs to transactions.
    zero_holding = client.post("/api/v1/portfolio", json={"market": "TH", "symbol": "ABC", "quantity": 0, "average_cost": 0, "currency": "THB"})
    assert zero_holding.status_code == 201
    assert client.delete("/api/v1/portfolio/00000000-0000-0000-0000-000000000000").status_code == 404


def test_portfolio_normalization_and_update(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    payload = {"market": " th ", "symbol": " abc ", "quantity": 2, "average_cost": 10, "currency": "thb"}
    created = client.post("/api/v1/portfolio", json=payload)
    assert created.status_code == 201
    item = created.json()
    assert item["market"] == "TH"
    assert item["symbol"] == "ABC"
    update = {**payload, "quantity": 3, "currency": "THB"}
    changed = client.put(f"/api/v1/portfolio/{item['id']}", json=update)
    assert changed.status_code == 200
    # Quantity remains transaction-derived and is not changed by metadata update.
    assert changed.json()["quantity"] == "2.00000000"
    cleanup_user_data(db, demo_user.id)


def test_watchlist_update_delete_and_invalid_market(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    payload = {"market": "US", "symbol": "ABC", "upper_percent": 5, "lower_percent": -5}
    created = client.post("/api/v1/watchlist", json=payload)
    assert created.status_code == 201
    item_id = created.json()["id"]
    changed = client.put(f"/api/v1/watchlist/{item_id}", json={**payload, "upper_percent": 7})
    assert changed.status_code == 200
    assert changed.json()["upper_percent"] == "7.0000"
    invalid = client.put(f"/api/v1/watchlist/{item_id}", json={**payload, "market": "JP"})
    assert invalid.status_code == 422
    assert client.delete(f"/api/v1/watchlist/{item_id}").status_code == 204
    assert client.delete(f"/api/v1/watchlist/{item_id}").status_code == 404


def test_watchlist_duplicate_update(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    first = client.post("/api/v1/watchlist", json={"market":"US","symbol":"AAA","upper_percent":5,"lower_percent":-5})
    second = client.post("/api/v1/watchlist", json={"market":"US","symbol":"BBB","upper_percent":5,"lower_percent":-5})
    assert first.status_code == 201 and second.status_code == 201
    conflict = client.put(f"/api/v1/watchlist/{second.json()['id']}", json={"market":"US","symbol":"AAA","upper_percent":5,"lower_percent":-5})
    assert conflict.status_code == 409
    cleanup_user_data(db, demo_user.id)
