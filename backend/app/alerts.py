from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import AlertHistory, AlertRule, MarketQuote, PortfolioHolding, User, WatchlistItem
from .market.calendar import market_status


def evaluate_watchlist(db: Session, user: User, now: datetime | None = None) -> list[AlertHistory]:
    now = now or datetime.now(timezone.utc)
    rows = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user.id, WatchlistItem.enabled.is_(True))).all()
    created: list[AlertHistory] = []
    for item in rows:
        rule = db.scalar(select(AlertRule).where(AlertRule.watchlist_item_id == item.id, AlertRule.enabled.is_(True)))
        quote = db.scalar(select(MarketQuote).where(MarketQuote.market == item.market, MarketQuote.symbol == item.symbol))
        if not rule or not quote or quote.change_percent is None:
            continue
        change = Decimal(str(quote.change_percent))
        if rule.upper_percent is not None and not rule.upper_armed and change < rule.upper_percent:
            rule.upper_armed = True
        if rule.lower_percent is not None and not rule.lower_armed and change > rule.lower_percent:
            rule.lower_armed = True
        alert_type = None
        if rule.upper_percent is not None and rule.upper_armed and change >= rule.upper_percent:
            alert_type = "watchlist_upper"
            rule.upper_armed = False
        elif rule.lower_percent is not None and rule.lower_armed and change <= rule.lower_percent:
            alert_type = "watchlist_lower"
            rule.lower_armed = False
        if not alert_type:
            continue
        rule.last_triggered_at = now
        row = AlertHistory(user_id=user.id, symbol=item.symbol, market=item.market, alert_type=alert_type,
            reference_price=None, trigger_price=quote.price, change_percent=change,
            message=f"{item.market} {item.symbol} threshold {change:.2f}%", sent_at=now, status="pending")
        db.add(row)
        created.append(row)
    return created


def evaluate_portfolio_session(db: Session, user: User, now: datetime | None = None) -> list[AlertHistory]:
    now = now or datetime.now(timezone.utc)
    created: list[AlertHistory] = []
    holdings = db.scalars(select(PortfolioHolding).where(PortfolioHolding.user_id == user.id, PortfolioHolding.enabled.is_(True))).all()
    for market in ("TH", "US"):
        status = market_status(market, now)
        if not status["trading_day"]:
            continue
        local = datetime.fromisoformat(status["local_time"])
        if status["open"]:
            alert_type = f"portfolio_open_{market}"
        else:
            close = status["session_close"]
            if not close or local < datetime.fromisoformat(close):
                continue
            alert_type = f"portfolio_close_{market}"
        existing = db.scalar(select(AlertHistory).where(
            AlertHistory.user_id == user.id,
            AlertHistory.market == market,
            AlertHistory.alert_type == alert_type,
            AlertHistory.sent_at >= datetime.combine(local.date(), datetime.min.time(), tzinfo=local.tzinfo)))
        if existing:
            continue
        for holding in [x for x in holdings if x.market == market]:
            quote = db.scalar(select(MarketQuote).where(MarketQuote.market == market, MarketQuote.symbol == holding.symbol))
            if not quote:
                continue
            change = ((Decimal(str(quote.price)) / Decimal(str(holding.average_cost))) - Decimal("1")) * Decimal("100")
            row = AlertHistory(user_id=user.id, symbol=holding.symbol, market=market, alert_type=alert_type,
                reference_price=holding.average_cost, trigger_price=quote.price, change_percent=change,
                message=f"{market} {holding.symbol} portfolio {alert_type} P/L {change:.2f}%", sent_at=now, status="pending")
            db.add(row); created.append(row)
    return created


def evaluate_alerts(db: Session, user: User) -> list[AlertHistory]:
    created = evaluate_watchlist(db, user)
    created.extend(evaluate_portfolio_session(db, user))
    db.commit()
    return created
