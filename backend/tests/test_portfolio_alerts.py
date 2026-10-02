from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
import uuid

from app.alerts import evaluate_portfolio_session
from app.models import AlertHistory, MarketQuote, PortfolioHolding
from conftest import cleanup_user_data


def test_th_open_close_and_duplicate(db, demo_user):
    cleanup_user_data(db, demo_user.id)
    symbol = "P" + uuid.uuid4().hex[:7].upper()
    db.add(PortfolioHolding(user_id=demo_user.id, market="TH", symbol=symbol,
                            quantity=10, average_cost=100, currency="THB", enabled=True))
    db.add(MarketQuote(market="TH", symbol=symbol, price=110, currency="THB",
                       change_percent=10, source="mock", quoted_at=datetime.now(ZoneInfo("UTC"))))
    db.commit()
    tz = ZoneInfo("Asia/Bangkok")
    opened = evaluate_portfolio_session(db, demo_user, datetime(2026, 10, 2, 10, 30, tzinfo=tz))
    db.commit()
    assert len(opened) == 1
    assert opened[0].alert_type == "portfolio_open_TH"
    assert opened[0].change_percent == Decimal("10")
    duplicate = evaluate_portfolio_session(db, demo_user, datetime(2026, 10, 2, 11, 0, tzinfo=tz))
    assert duplicate == []
    closed = evaluate_portfolio_session(db, demo_user, datetime(2026, 10, 2, 16, 31, tzinfo=tz))
    db.commit()
    assert len(closed) == 1
    assert closed[0].alert_type == "portfolio_close_TH"
    cleanup_user_data(db, demo_user.id)
    db.query(MarketQuote).filter(MarketQuote.symbol == symbol).delete()
    db.commit()


def test_weekend_does_not_create_portfolio_alert(db, demo_user):
    cleanup_user_data(db, demo_user.id)
    symbol = "W" + uuid.uuid4().hex[:7].upper()
    db.add(PortfolioHolding(user_id=demo_user.id, market="US", symbol=symbol,
                            quantity=1, average_cost=100, currency="USD", enabled=True))
    db.add(MarketQuote(market="US", symbol=symbol, price=120, currency="USD",
                       change_percent=20, source="mock", quoted_at=datetime.now(ZoneInfo("UTC"))))
    db.commit()
    weekend = evaluate_portfolio_session(db, demo_user, datetime(2026, 10, 3, 10, 0, tzinfo=ZoneInfo("America/New_York")))
    assert weekend == []
    cleanup_user_data(db, demo_user.id)
    db.query(MarketQuote).filter(MarketQuote.symbol == symbol).delete()
    db.commit()
