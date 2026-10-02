from conftest import cleanup_user_data


def test_settings_upsert_delete_and_key_validation(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    created = client.put("/api/v1/settings/theme", json={"value":{"mode":"light"}})
    assert created.status_code == 200
    changed = client.put("/api/v1/settings/theme", json={"value":{"mode":"dark"}})
    assert changed.status_code == 200
    assert changed.json()["value"]["mode"] == "dark"
    assert client.delete("/api/v1/settings/theme").status_code == 204
    assert client.delete("/api/v1/settings/theme").status_code == 404
    assert client.put("/api/v1/settings/" + "x" * 101, json={"value":1}).status_code == 422


def test_alert_history_limit_and_empty(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    assert client.get("/api/v1/alerts/history?limit=1").status_code == 200
    assert client.get("/api/v1/alerts/history?limit=0").status_code == 422
    assert client.get("/api/v1/alerts/history?limit=201").status_code == 422
    assert client.get("/api/v1/alerts/history").json() == []
