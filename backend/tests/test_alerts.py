from decimal import Decimal
from datetime import datetime, timezone
import uuid
from sqlalchemy import delete
from app.alerts import evaluate_watchlist
from app.models import AlertRule, MarketQuote, WatchlistItem
from conftest import cleanup_user_data


def test_watchlist_hysteresis(db, demo_user):
    cleanup_user_data(db, demo_user.id)
    symbol = "T" + uuid.uuid4().hex[:7].upper()
    item = WatchlistItem(user_id=demo_user.id, market="TH", symbol=symbol, enabled=True)
    db.add(item)
    db.flush()
    rule = AlertRule(watchlist_item_id=item.id, upper_percent=5, lower_percent=-5, enabled=True)
    quote = MarketQuote(market="TH", symbol=symbol, price=106, currency="THB", change_percent=6,
                        source="test", quoted_at=datetime.now(timezone.utc))
    db.add_all([rule, quote])
    db.commit()
    first = evaluate_watchlist(db, demo_user)
    db.commit()
    assert len(first) == 1
    assert first[0].alert_type == "watchlist_upper"
    second = evaluate_watchlist(db, demo_user)
    assert second == []
    quote.change_percent = Decimal("4")
    db.commit()
    assert evaluate_watchlist(db, demo_user) == []
    quote.change_percent = Decimal("6")
    db.commit()
    third = evaluate_watchlist(db, demo_user)
    assert len(third) == 1
    cleanup_user_data(db, demo_user.id)
    db.execute(delete(MarketQuote).where(MarketQuote.market == "TH", MarketQuote.symbol == symbol))
    db.commit()


def test_alert_endpoint_empty(client, demo_user, db):
    cleanup_user_data(db, demo_user.id)
    response = client.post("/api/v1/alerts/evaluate")
    assert response.status_code == 200
    assert response.json()["created"] == 0
