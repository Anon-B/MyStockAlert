from datetime import date, datetime, time
from zoneinfo import ZoneInfo

MARKETS = {
    "TH": {"timezone": "Asia/Bangkok", "sessions": [(time(10,0), time(12,30)), (time(14,30), time(16,30))]},
    "US": {"timezone": "America/New_York", "sessions": [(time(9,30), time(16,0))]},
}

# Override through settings later; this keeps weekends and explicit holidays deterministic.
def is_trading_day(market: str, day: date, holidays: set[date] | None = None) -> bool:
    return day.weekday() < 5 and day not in (holidays or set())

def session_bounds(market: str, now: datetime | None = None):
    cfg = MARKETS[market]
    tz = ZoneInfo(cfg["timezone"])
    local = (now or datetime.now(tz)).astimezone(tz)
    if not is_trading_day(market, local.date()):
        return None
    for opened, closed in cfg["sessions"]:
        start = datetime.combine(local.date(), opened, tzinfo=tz)
        end = datetime.combine(local.date(), closed, tzinfo=tz)
        if start <= local <= end:
            return start, end
    return None

def market_status(market: str, now: datetime | None = None) -> dict:
    cfg = MARKETS[market]
    tz = ZoneInfo(cfg["timezone"])
    local = (now or datetime.now(tz)).astimezone(tz)
    trading_day = is_trading_day(market, local.date())
    bounds = session_bounds(market, local)
    if trading_day and bounds is None:
        final_open, final_close = cfg["sessions"][-1]
        bounds = (datetime.combine(local.date(), final_open, tzinfo=tz), datetime.combine(local.date(), final_close, tzinfo=tz))
    return {"market": market, "timezone": cfg["timezone"], "trading_day": trading_day, "open": session_bounds(market, local) is not None, "local_time": local.isoformat(), "session_open": bounds[0].isoformat() if bounds else None, "session_close": bounds[1].isoformat() if bounds else None}
