from datetime import datetime, timezone
import uuid

from app.alerts import evaluate_watchlist
from app.models import AlertRule, MarketQuote, WatchlistItem
from conftest import cleanup_user_data


def test_lower_hysteresis_and_disabled_rule(db, demo_user):
    cleanup_user_data(db, demo_user.id)
    symbol = "L" + uuid.uuid4().hex[:7].upper()
    item = WatchlistItem(user_id=demo_user.id, market="TH", symbol=symbol, enabled=True)
    db.add(item)
    db.flush()
    rule = AlertRule(watchlist_item_id=item.id, upper_percent=None, lower_percent=-5, enabled=True)
    quote = MarketQuote(market="TH", symbol=symbol, price=94, currency="THB", change_percent=-6,
                        source="mock", quoted_at=datetime.now(timezone.utc))
    db.add_all([rule, quote])
    db.commit()
    first = evaluate_watchlist(db, demo_user)
    db.commit()
    assert len(first) == 1 and first[0].alert_type == "watchlist_lower"
    assert evaluate_watchlist(db, demo_user) == []
    quote.change_percent = -4
    db.commit()
    assert evaluate_watchlist(db, demo_user) == []
    quote.change_percent = -6
    db.commit()
    assert len(evaluate_watchlist(db, demo_user)) == 1
    cleanup_user_data(db, demo_user.id)
    db.query(MarketQuote).filter(MarketQuote.symbol == symbol).delete()
    db.commit()


def test_disabled_watchlist_and_missing_quote(db, demo_user):
    cleanup_user_data(db, demo_user.id)
    symbol = "D" + uuid.uuid4().hex[:7].upper()
    item = WatchlistItem(user_id=demo_user.id, market="US", symbol=symbol, enabled=False)
    db.add(item)
    db.flush()
    db.add(AlertRule(watchlist_item_id=item.id, upper_percent=5, lower_percent=-5, enabled=True))
    db.commit()
    assert evaluate_watchlist(db, demo_user) == []
    cleanup_user_data(db, demo_user.id)
