from datetime import date, datetime, time
from zoneinfo import ZoneInfo

MARKETS = {
    "TH": {"timezone": "Asia/Bangkok", "sessions": [(time(10,0), time(12,30)), (time(14,30), time(16,30))]},
    "US": {"timezone": "America/New_York", "sessions": [(time(9,30), time(16,0))]},
}

TH_HOLIDAYS_2026 = {
    date(2026,1,1), date(2026,1,2), date(2026,3,3), date(2026,4,6),
    date(2026,4,13), date(2026,4,14), date(2026,4,15), date(2026,5,1),
    date(2026,5,4), date(2026,6,1), date(2026,6,3), date(2026,7,28),
    date(2026,7,29), date(2026,8,12), date(2026,10,13), date(2026,10,16),
    date(2026,10,23), date(2026,12,7), date(2026,12,10), date(2026,12,31),
}

US_HOLIDAYS_2026 = {
    date(2026,1,1), date(2026,1,19), date(2026,2,16), date(2026,4,3),
    date(2026,5,25), date(2026,6,19), date(2026,7,3), date(2026,9,7),
    date(2026,11,26), date(2026,12,25),
}
US_EARLY_CLOSE_2026 = {date(2026,11,27): time(13,0), date(2026,12,24): time(13,0)}

def holidays_for(market: str, year: int) -> set[date]:
    if year == 2026:
        return TH_HOLIDAYS_2026 if market == "TH" else US_HOLIDAYS_2026
    return set()

def is_trading_day(market: str, day: date, holidays: set[date] | None = None) -> bool:
    return day.weekday() < 5 and day not in (holidays if holidays is not None else holidays_for(market, day.year))

def configured_sessions(market: str, day: date):
    sessions = MARKETS[market]["sessions"]
    if market == "US" and day in US_EARLY_CLOSE_2026:
        return [(sessions[0][0], US_EARLY_CLOSE_2026[day])]
    return sessions
def session_bounds(market: str, now: datetime | None = None):
    cfg = MARKETS[market]
    tz = ZoneInfo(cfg["timezone"])
    local = (now or datetime.now(tz)).astimezone(tz)
    if not is_trading_day(market, local.date()):
        return None
    for opened, closed in configured_sessions(market, local.date()):
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
    sessions = configured_sessions(market, local.date())
    if trading_day and bounds is None:
        opened, closed = sessions[-1]
        bounds = (datetime.combine(local.date(), opened, tzinfo=tz), datetime.combine(local.date(), closed, tzinfo=tz))
    return {
        "market": market, "timezone": cfg["timezone"], "trading_day": trading_day,
        "open": session_bounds(market, local) is not None,
        "local_time": local.isoformat(),
        "session_open": bounds[0].isoformat() if bounds else None,
        "session_close": bounds[1].isoformat() if bounds else None,
    }
