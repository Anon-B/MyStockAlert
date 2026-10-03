from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .models import AlertHistory, AlertOutbox, AlertRule, MarketQuote, PortfolioHolding, User, WatchlistItem
from .market.calendar import market_status


def evaluate_watchlist(db: Session, user: User, now: datetime | None = None) -> list[AlertHistory]:
    now = now or datetime.now(timezone.utc)
    rows = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user.id, WatchlistItem.enabled.is_(True))).all()
    created: list[AlertHistory] = []
    for item in rows:
        rule = db.scalar(select(AlertRule).where(AlertRule.watchlist_item_id == item.id, AlertRule.enabled.is_(True)))
        quote = db.scalar(select(MarketQuote).where(MarketQuote.market == item.market, MarketQuote.symbol == item.symbol))
        if not rule or not quote:
            continue
        change = Decimal(str(quote.change_percent)) if quote.change_percent is not None else None
        price = Decimal(str(quote.price))
        upper_hit = rule.upper_price is not None and rule.upper_armed and price >= rule.upper_price
        lower_hit = rule.lower_price is not None and rule.lower_armed and price <= rule.lower_price
        if change is None and rule.upper_percent is None and rule.lower_percent is None and not upper_hit and not lower_hit:
            continue
        if rule.upper_price is not None and not rule.upper_armed and price < rule.upper_price:
            rule.upper_armed = True
        if rule.lower_price is not None and not rule.lower_armed and price > rule.lower_price:
            rule.lower_armed = True
        if rule.upper_percent is not None and not rule.upper_armed and change is not None and change < rule.upper_percent:
            rule.upper_armed = True
        if rule.lower_percent is not None and not rule.lower_armed and change is not None and change > rule.lower_percent:
            rule.lower_armed = True
        alert_type = None
        if upper_hit or (rule.upper_percent is not None and rule.upper_armed and change is not None and change >= rule.upper_percent):
            alert_type = "watchlist_upper"
            rule.upper_armed = False
        elif lower_hit or (rule.lower_percent is not None and rule.lower_armed and change is not None and change <= rule.lower_percent):
            alert_type = "watchlist_lower"
            rule.lower_armed = False
        if not alert_type:
            continue
        previous_trigger = rule.last_triggered_at.isoformat() if rule.last_triggered_at else "never"
        rule.last_triggered_at = now
        # Keep the idempotency key stable for one armed cycle, but allow a
        # new alert after the rule has been re-armed in the same minute.
        key = f"watch:{user.id}:{item.id}:{alert_type}:{previous_trigger}"
        try:
            with db.begin_nested():
                row = AlertHistory(user_id=user.id, symbol=item.symbol, market=item.market, alert_type=alert_type,
                    reference_price=None, trigger_price=quote.price, change_percent=change,
                    message=f"{item.market} {item.symbol} threshold price={price} change={change:.2f}%" if change is not None else f"{item.market} {item.symbol} price={price}", triggered_at=now,
                    idempotency_key=key, status="pending", provider="line", delivery_status="PENDING")
                db.add(row); db.flush()
                db.add(AlertOutbox(alert_history_id=row.id, channel="line"))
            created.append(row)
        except IntegrityError:
            # Another worker won the same armed cycle. The unique idempotency key
            # is the database-level final guard against duplicate logical alerts.
            continue
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
            AlertHistory.triggered_at >= datetime.combine(local.date(), datetime.min.time(), tzinfo=local.tzinfo)))
        if existing:
            continue
        for holding in [x for x in holdings if x.market == market]:
            quote = db.scalar(select(MarketQuote).where(MarketQuote.market == market, MarketQuote.symbol == holding.symbol))
            if not quote:
                continue
            change = ((Decimal(str(quote.price)) / Decimal(str(holding.average_cost))) - Decimal("1")) * Decimal("100")
            key = f"portfolio:{user.id}:{market}:{alert_type}:{local.date()}"
            row = AlertHistory(user_id=user.id, symbol=holding.symbol, market=market, alert_type=alert_type,
                reference_price=holding.average_cost, trigger_price=quote.price, change_percent=change,
                message=f"{market} {holding.symbol} portfolio {alert_type} P/L {change:.2f}%", triggered_at=now,
                idempotency_key=f"{key}:{holding.symbol}", status="pending", provider="line", delivery_status="PENDING")
            db.add(row); db.flush()
            db.add(AlertOutbox(alert_history_id=row.id, channel="line")); created.append(row)
    return created


def evaluate_alerts(db: Session, user: User) -> list[AlertHistory]:
    created = evaluate_watchlist(db, user)
    created.extend(evaluate_portfolio_session(db, user))
    db.commit()
    return created
