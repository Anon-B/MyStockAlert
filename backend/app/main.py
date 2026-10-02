import uuid
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Query, status
from sqlalchemy import select, delete, func
from sqlalchemy.orm import Session
from .db import get_db
from .models import AlertHistory, AlertOutbox, AlertRule, PortfolioHolding, Setting, User, WatchlistItem
from .models import MarketQuote
from .market.calendar import market_status
from .market.providers import YahooProvider
from .alerts import evaluate_alerts
from .schemas import MarketStatusOut, QuoteOut
from .schemas import AlertHistoryOut, PortfolioCreate, PortfolioOut, PortfolioUpdate, SettingIn, SettingOut, WatchlistCreate, WatchlistOut, WatchlistUpdate

app = FastAPI(title="MyStockAlert API", version="0.2.0")


def current_user(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.username == "demo"))
    if not user:
        raise HTTPException(status_code=503, detail="demo user is not initialized")
    return user

def normalize_market_symbol(market: str, symbol: str) -> tuple[str, str]:
    market = market.strip().upper()
    symbol = symbol.strip().upper()
    if market not in {"TH", "US"}:
        raise HTTPException(422, "market must be TH or US")
    if not symbol:
        raise HTTPException(422, "symbol is required")
    return market, symbol

@app.get("/health")
def health() -> dict:
    return {"status":"ok","service":"backend","timestamp":datetime.now(timezone.utc).isoformat()}

@app.get("/api/v1/health")
def api_health() -> dict:
    return {"status":"ok","service":"backend"}

@app.get("/api/v1/portfolio", response_model=list[PortfolioOut])
def list_portfolio(db: Session=Depends(get_db), user: User=Depends(current_user)):
    return db.scalars(select(PortfolioHolding).where(PortfolioHolding.user_id==user.id).order_by(PortfolioHolding.market, PortfolioHolding.symbol)).all()

@app.post("/api/v1/portfolio", response_model=PortfolioOut, status_code=status.HTTP_201_CREATED)
def create_portfolio(payload: PortfolioCreate, db: Session=Depends(get_db), user: User=Depends(current_user)):
    market, symbol = normalize_market_symbol(payload.market, payload.symbol)
    row = PortfolioHolding(user_id=user.id, market=market, symbol=symbol, quantity=payload.quantity, average_cost=payload.average_cost, currency=payload.currency.upper(), enabled=payload.enabled)
    db.add(row); db.commit(); db.refresh(row)
    return row

@app.put("/api/v1/portfolio/{item_id}", response_model=PortfolioOut)
def update_portfolio(item_id: uuid.UUID, payload: PortfolioUpdate, db: Session=Depends(get_db), user: User=Depends(current_user)):
    row = db.scalar(select(PortfolioHolding).where(PortfolioHolding.id==item_id, PortfolioHolding.user_id==user.id))
    if not row: raise HTTPException(404, "portfolio holding not found")
    market, symbol = normalize_market_symbol(payload.market, payload.symbol)
    for k,v in {"market":market,"symbol":symbol,"quantity":payload.quantity,"average_cost":payload.average_cost,"currency":payload.currency.upper(),"enabled":payload.enabled}.items(): setattr(row,k,v)
    db.commit(); db.refresh(row); return row

@app.delete("/api/v1/portfolio/{item_id}", status_code=204)
def delete_portfolio(item_id: uuid.UUID, db: Session=Depends(get_db), user: User=Depends(current_user)):
    row = db.scalar(select(PortfolioHolding).where(PortfolioHolding.id==item_id, PortfolioHolding.user_id==user.id))
    if not row: raise HTTPException(404, "portfolio holding not found")
    db.delete(row); db.commit()

@app.get("/api/v1/watchlist", response_model=list[WatchlistOut])
def list_watchlist(db: Session=Depends(get_db), user: User=Depends(current_user)):
    rows = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id==user.id).order_by(WatchlistItem.market, WatchlistItem.symbol)).all()
    result=[]
    for row in rows:
        rule=db.scalar(select(AlertRule).where(AlertRule.watchlist_item_id==row.id))
        result.append({"id":row.id,"market":row.market,"symbol":row.symbol,"enabled":row.enabled,"upper_percent":rule.upper_percent if rule else None,"lower_percent":rule.lower_percent if rule else None})
    return result

@app.post("/api/v1/watchlist", response_model=WatchlistOut, status_code=201)
def create_watchlist(payload: WatchlistCreate, db: Session=Depends(get_db), user: User=Depends(current_user)):
    market,symbol=normalize_market_symbol(payload.market,payload.symbol)
    exists=db.scalar(select(WatchlistItem).where(WatchlistItem.user_id==user.id,WatchlistItem.market==market,WatchlistItem.symbol==symbol))
    if exists: raise HTTPException(409,"watchlist item already exists")
    row=WatchlistItem(user_id=user.id,market=market,symbol=symbol,enabled=payload.enabled); db.add(row); db.flush()
    rule=AlertRule(watchlist_item_id=row.id,upper_percent=payload.upper_percent,lower_percent=payload.lower_percent,enabled=True); db.add(rule)
    db.commit(); db.refresh(row)
    return {"id":row.id,"market":row.market,"symbol":row.symbol,"enabled":row.enabled,"upper_percent":rule.upper_percent,"lower_percent":rule.lower_percent}

@app.put("/api/v1/watchlist/{item_id}", response_model=WatchlistOut)
def update_watchlist(item_id: uuid.UUID,payload: WatchlistUpdate,db: Session=Depends(get_db),user: User=Depends(current_user)):
    row=db.scalar(select(WatchlistItem).where(WatchlistItem.id==item_id,WatchlistItem.user_id==user.id))
    if not row: raise HTTPException(404,"watchlist item not found")
    market,symbol=normalize_market_symbol(payload.market,payload.symbol)
    duplicate=db.scalar(select(WatchlistItem).where(WatchlistItem.user_id==user.id,WatchlistItem.market==market,WatchlistItem.symbol==symbol,WatchlistItem.id!=item_id))
    if duplicate: raise HTTPException(409,"watchlist item already exists")
    row.market,row.symbol,row.enabled=market,symbol,payload.enabled
    rule=db.scalar(select(AlertRule).where(AlertRule.watchlist_item_id==row.id))
    if not rule: rule=AlertRule(watchlist_item_id=row.id); db.add(rule)
    rule.upper_percent,rule.lower_percent=payload.upper_percent,payload.lower_percent
    db.commit(); db.refresh(row)
    return {"id":row.id,"market":row.market,"symbol":row.symbol,"enabled":row.enabled,"upper_percent":rule.upper_percent,"lower_percent":rule.lower_percent}

@app.delete("/api/v1/watchlist/{item_id}",status_code=204)
def delete_watchlist(item_id: uuid.UUID,db: Session=Depends(get_db),user: User=Depends(current_user)):
    row=db.scalar(select(WatchlistItem).where(WatchlistItem.id==item_id,WatchlistItem.user_id==user.id))
    if not row: raise HTTPException(404,"watchlist item not found")
    db.delete(row); db.commit()

@app.get("/api/v1/settings",response_model=list[SettingOut])
def list_settings(db: Session=Depends(get_db),user: User=Depends(current_user)):
    rows=db.scalars(select(Setting).where(Setting.user_id==user.id).order_by(Setting.key)).all()
    return [{"key":r.key,"value":r.value_encrypted_or_json} for r in rows]

@app.put("/api/v1/settings/{key}",response_model=SettingOut)
def upsert_setting(key: str,payload: SettingIn,db: Session=Depends(get_db),user: User=Depends(current_user)):
    key=key.strip()
    if not key or len(key)>100: raise HTTPException(422,"invalid setting key")
    row=db.scalar(select(Setting).where(Setting.user_id==user.id,Setting.key==key))
    if not row: row=Setting(user_id=user.id,key=key); db.add(row)
    row.value_encrypted_or_json=payload.value; db.commit(); db.refresh(row)
    return {"key":row.key,"value":row.value_encrypted_or_json}

@app.get("/api/v1/alerts/history",response_model=list[AlertHistoryOut])
def alert_history(limit:int=Query(50,ge=1,le=200),db: Session=Depends(get_db),user: User=Depends(current_user)):
    return db.scalars(select(AlertHistory).where(AlertHistory.user_id==user.id).order_by(AlertHistory.sent_at.desc().nullslast()).limit(limit)).all()

@app.delete("/api/v1/settings/{key}", status_code=204)
def delete_setting(key: str, db: Session=Depends(get_db), user: User=Depends(current_user)):
    row = db.scalar(select(Setting).where(Setting.user_id==user.id, Setting.key==key.strip()))
    if not row: raise HTTPException(404, "setting not found")
    db.delete(row); db.commit()


@app.get("/api/v1/system/status")
def system_status(db: Session=Depends(get_db), user: User=Depends(current_user)):
    db_ok = True
    try:
        db.execute(select(func.count(User.id))).scalar_one()
    except Exception:
        db_ok = False
    quote_count = db.scalar(select(func.count(MarketQuote.id))) or 0
    pending = db.scalar(select(func.count(AlertOutbox.id)).where(AlertOutbox.status == "pending")) or 0
    return {"status": "ok" if db_ok else "degraded", "database": db_ok, "quote_cache": quote_count, "pending_deliveries": pending, "version": app.version}

@app.get("/api/v1/portfolio/summary")
def portfolio_summary(db: Session=Depends(get_db), user: User=Depends(current_user)):
    holdings = db.scalars(select(PortfolioHolding).where(PortfolioHolding.user_id==user.id, PortfolioHolding.enabled.is_(True))).all()
    quotes = db.scalars(select(MarketQuote)).all()
    qmap = {(q.market,q.symbol): q for q in quotes}
    totals = {"THB": {"cost_basis": 0.0, "current_value": 0.0, "pnl": 0.0}, "USD": {"cost_basis": 0.0, "current_value": 0.0, "pnl": 0.0}}
    rows = []
    for h in holdings:
        cost = float(h.quantity * h.average_cost)
        q = qmap.get((h.market,h.symbol))
        current = float(h.quantity * q.price) if q else None
        pnl = current - cost if current is not None else None
        currency = h.currency
        totals[currency]["cost_basis"] += cost
        if current is not None:
            totals[currency]["current_value"] += current; totals[currency]["pnl"] += pnl
        rows.append({"id": str(h.id), "market": h.market, "symbol": h.symbol, "currency": currency, "cost_basis": cost, "current_value": current, "pnl": pnl, "pnl_percent": (pnl/cost*100 if pnl is not None and cost else None), "stale": bool(q and (datetime.now(timezone.utc)-q.quoted_at).total_seconds()>300)})
    return {"rows": rows, "totals": totals}

@app.get("/api/v1/market/status", response_model=list[MarketStatusOut])
def market_status_api():
    return [market_status("TH"), market_status("US")]

@app.get("/api/v1/market/providers/health")
async def provider_health():
    provider = YahooProvider(timeout=3.0, retries=0)
    results = []
    for market, symbol in (("US", "AAPL"), ("TH", "PTT")):
        started = datetime.now(timezone.utc)
        try:
            await provider.quote(market, symbol)
            results.append({"market": market, "provider": "yahoo", "ok": True, "latency_ms": round((datetime.now(timezone.utc)-started).total_seconds()*1000, 1)})
        except Exception as exc:
            results.append({"market": market, "provider": "yahoo", "ok": False, "latency_ms": round((datetime.now(timezone.utc)-started).total_seconds()*1000, 1), "error": str(exc)})
    return results

@app.get("/api/v1/market/quotes", response_model=list[QuoteOut])
async def market_quotes(db: Session=Depends(get_db), user: User=Depends(current_user)):
    holdings = db.scalars(select(PortfolioHolding).where(PortfolioHolding.user_id==user.id, PortfolioHolding.enabled.is_(True))).all()
    watches = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id==user.id, WatchlistItem.enabled.is_(True))).all()
    symbols = {(x.market, x.symbol) for x in [*holdings, *watches]}
    provider = YahooProvider()
    now = datetime.now(timezone.utc)
    output=[]
    for market, symbol in sorted(symbols):
        try:
            q = await provider.quote(market, symbol)
            row = db.scalar(select(MarketQuote).where(MarketQuote.market==market, MarketQuote.symbol==symbol))
            if not row:
                row = MarketQuote(market=market, symbol=symbol)
                db.add(row)
            row.price=q.price; row.currency=q.currency; row.change_percent=q.change_percent
            row.source=q.source; row.quoted_at=q.timestamp
            db.commit(); db.refresh(row)
        except Exception:
            row = db.scalar(select(MarketQuote).where(MarketQuote.market==market, MarketQuote.symbol==symbol))
            if not row:
                continue
        age = (now - row.quoted_at).total_seconds()
        output.append({"market":row.market,"symbol":row.symbol,"price":row.price,"currency":row.currency,"change_percent":row.change_percent,"source":row.source,"quoted_at":row.quoted_at,"stale":age > 300})
    return output


@app.post("/api/v1/alerts/evaluate")
def evaluate_alerts_api(db: Session=Depends(get_db), user: User=Depends(current_user)):
    rows = evaluate_alerts(db, user)
    return {"created": len(rows), "alerts": [{"id": str(x.id), "market": x.market, "symbol": x.symbol, "type": x.alert_type, "change_percent": x.change_percent} for x in rows]}
