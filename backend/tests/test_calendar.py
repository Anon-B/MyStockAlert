from datetime import datetime
from zoneinfo import ZoneInfo

from app.market.calendar import is_trading_day, market_status, session_bounds


def test_trading_day_weekend_and_holiday():
    assert is_trading_day("TH", datetime(2026, 10, 2).date()) is True
    assert is_trading_day("TH", datetime(2026, 10, 3).date()) is False
    assert is_trading_day("TH", datetime(2026, 10, 2).date(), {datetime(2026, 10, 2).date()}) is False


def test_th_sessions_and_break():
    tz = ZoneInfo("Asia/Bangkok")
    assert session_bounds("TH", datetime(2026, 10, 2, 10, 30, tzinfo=tz)) is not None
    assert session_bounds("TH", datetime(2026, 10, 2, 13, 0, tzinfo=tz)) is None
    assert session_bounds("TH", datetime(2026, 10, 2, 15, 0, tzinfo=tz)) is not None


def test_us_session():
    tz = ZoneInfo("America/New_York")
    opened = market_status("US", datetime(2026, 10, 2, 9, 30, tzinfo=tz))
    closed = market_status("US", datetime(2026, 10, 2, 16, 1, tzinfo=tz))
    assert opened["open"] is True
    assert closed["open"] is False
    assert closed["trading_day"] is True
