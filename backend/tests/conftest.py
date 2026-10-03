import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from app.db import SessionLocal
from app.main import app, current_user
from app.models import AlertHistory, AlertOutbox, AlertRule, MarketQuote, PortfolioHolding, User, WatchlistItem

@pytest.fixture
def client():
    session = SessionLocal()
    user = session.scalar(select(User).where(User.username == "demo"))
    session.close()
    app.dependency_overrides[current_user] = lambda: user
    with TestClient(app) as value:
        yield value
    app.dependency_overrides.pop(current_user, None)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def demo_user(db):
    return db.scalar(select(User).where(User.username == "demo"))

def cleanup_user_data(db, user_id):
    # Some alert tests intentionally leave the newest alert pending so the
    # cleanup helper must discard uncommitted ORM objects before deleting
    # persisted rows.
    db.rollback()
    watch_ids = db.scalars(select(WatchlistItem.id).where(WatchlistItem.user_id == user_id)).all()
    if watch_ids:
        db.execute(delete(AlertRule).where(AlertRule.watchlist_item_id.in_(watch_ids)))
    alert_ids = db.scalars(select(AlertHistory.id).where(AlertHistory.user_id == user_id)).all()
    if alert_ids:
        db.execute(delete(AlertOutbox).where(AlertOutbox.alert_history_id.in_(alert_ids)))
    db.execute(delete(AlertHistory).where(AlertHistory.user_id == user_id))
    db.execute(delete(PortfolioHolding).where(PortfolioHolding.user_id == user_id))
    db.execute(delete(WatchlistItem).where(WatchlistItem.user_id == user_id))
    db.commit()
