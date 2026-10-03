import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, delete, func
from sqlalchemy.orm import Session
from .db import get_db
from .models import AlertHistory, AlertOutbox, AlertRule, PortfolioHolding, PortfolioTransaction, Setting, User, WatchlistItem, AuthSession, AuditLog
from .models import MarketQuote, StockMaster, FxRate
from .market.calendar import market_status
from .market.providers import YahooProvider, search_symbols
from .alerts import evaluate_alerts
from .security import hash_password, verify_password, new_session_token, session_expiry, hash_token
from .finance import FeeBreakdown, calculate_transaction, convert_to_thb
import os
import hmac
from .schemas import MarketStatusOut, QuoteOut
from .schemas import AlertHistoryOut, PortfolioCreate, PortfolioOut, PortfolioUpdate, PortfolioTransactionCreate, PortfolioTransactionOut, SettingIn, SettingOut, WatchlistCreate, WatchlistOut, WatchlistUpdate

app = FastAPI(title="MyStockAlert API", version="0.3.0")

@app.on_event("startup")
def bootstrap_security():
    secret = os.getenv("APP_SECRET", "")
    if len(secret) < 32 or secret == "change-me":
        raise RuntimeError("APP_SECRET must be a strong secret (>=32 characters)")
    password = os.getenv("APP_BOOTSTRAP_PASSWORD", "")
    if not password or len(password) < 12:
        raise RuntimeError("APP_BOOTSTRAP_PASSWORD must be set with >=12 characters")
    db = next(get_db())
    try:
        user = db.scalar(select(User).where(User.username == "demo"))
        if user and not user.password_hash.startswith("pbkdf2_sha256$"):
            user.password_hash = hash_password(password)
            db.commit()
    finally:
        db.close()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    raw = request.cookies.get("ms_session")
    if not raw:
        raise HTTPException(status_code=401, detail="authentication required")
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(raw)))
    if not session or session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="session expired")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="invalid session")
    session.last_seen_at = datetime.now(timezone.utc)
    return user

@app.post("/api/v1/auth/register", status_code=201)
def register(payload: dict, response: Response, request: Request, db: Session = Depends(get_db)):
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    if not username or not password:
        raise HTTPException(422, "username and password are required")
    if len(username) > 100:
        raise HTTPException(422, "username is too long")
    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(409, "username already exists")
    user = User(username=username, password_hash=hash_password(password))
    db.add(user)
    db.flush()
    raw, digest = new_session_token()
    db.add(AuthSession(user_id=user.id, token_hash=digest, expires_at=session_expiry()))
    db.add(AuditLog(user_id=user.id, action="register", resource_type="user", resource_id=str(user.id), ip_address=request.client.host if request.client else None))
    db.commit()
    response.set_cookie("ms_session", raw, httponly=True, secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", samesite="lax", max_age=43200, path="/")
    return {"username": user.username, "expires_in": 43200}

@app.get("/api/v1/auth/me")
def auth_me(user: User = Depends(current_user)):
    return {"username": user.username}

@app.post("/api/v1/auth/login")
def login(payload: dict, response: Response, request: Request, db: Session = Depends(get_db)):
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    user = db.scalar(select(User).where(User.username == username))
    if not user or not verify_password(password, user.password_hash):
        db.add(AuditLog(user_id=user.id if user else None, action="login_failed", resource_type="user", resource_id=str(user.id) if user else None, ip_address=request.client.host if request.client else None))
        db.commit()
        raise HTTPException(401, "invalid credentials")
    raw, digest = new_session_token()
    db.add(AuthSession(user_id=user.id, token_hash=digest, expires_at=session_expiry()))
    db.add(AuditLog(user_id=user.id, action="login", resource_type="user", resource_id=str(user.id), ip_address=request.client.host if request.client else None))
    db.commit()
    response.set_cookie("ms_session", raw, httponly=True, secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", samesite="lax", max_age=43200, path="/")
    return {"username": user.username, "expires_in": 43200}

@app.post("/api/v1/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("ms_session")
    if raw:
        session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(raw)))
        if session:
            db.add(AuditLog(user_id=session.user_id, action="logout", resource_type="user", resource_id=str(session.user_id), ip_address=request.client.host if request.client else None))
            db.delete(session)
            db.commit()
    response.delete_cookie("ms_session", path="/")

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
    return db.scalars(select(PortfolioHolding).where(PortfolioHolding.user_id==user.id, PortfolioHolding.enabled.is_(True)).order_by(PortfolioHolding.market, PortfolioHolding.symbol)).all()

@app.post("/api/v1/portfolio", response_model=PortfolioOut, status_code=status.HTTP_201_CREATED)
def create_portfolio(payload: PortfolioCreate, db: Session=Depends(get_db), user: User=Depends(current_user)):
    market, symbol = normalize_market_symbol(payload.market, payload.symbol)
    row = db.scalar(select(PortfolioHolding).where(PortfolioHolding.user_id==user.id, PortfolioHolding.market==market, PortfolioHolding.symbol==symbol))
    if row:
        if row.enabled:
            raise HTTPException(409, "portfolio holding already exists")
        row.quantity=payload.quantity; row.average_cost=payload.average_cost; row.currency=payload.currency.upper(); row.enabled=payload.enabled
    else:
        row = PortfolioHolding(user_id=user.id, market=market, symbol=symbol, quantity=payload.quantity, average_cost=payload.average_cost, currency=payload.currency.upper(), enabled=payload.enabled)
        db.add(row)
    db.commit(); db.refresh(row)
    return row

@app.get("/api/v1/portfolio/{item_id}/transactions", response_model=list[PortfolioTransactionOut])
def list_portfolio_transactions(item_id: uuid.UUID, db: Session=Depends(get_db), user: User=Depends(current_user)):
    holding = db.scalar(select(PortfolioHolding).where(PortfolioHolding.id==item_id, PortfolioHolding.user_id==user.id))
    if not holding:
        raise HTTPException(404, "portfolio holding not found")
    return db.scalars(select(PortfolioTransaction).where(PortfolioTransaction.holding_id==item_id).order_by(PortfolioTransaction.executed_at.desc())).all()

@app.post("/api/v1/portfolio/{item_id}/transactions", response_model=PortfolioTransactionOut, status_code=201)
def create_portfolio_transaction(item_id: uuid.UUID, payload: PortfolioTransactionCreate, request: Request, db: Session=Depends(get_db), user: User=Depends(current_user)):
    holding = db.scalar(select(PortfolioHolding).where(PortfolioHolding.id==item_id, PortfolioHolding.user_id==user.id, PortfolioHolding.enabled.is_(True)))
    if not holding:
        raise HTTPException(404, "portfolio holding not found")
    idempotency_key = request.headers.get("Idempotency-Key", "").strip()
    if not idempotency_key or len(idempotency_key) > 128:
        raise HTTPException(400, "Idempotency-Key header is required (max 128 chars)")
    existing = db.scalar(select(PortfolioTransaction).where(PortfolioTransaction.user_id==user.id, PortfolioTransaction.idempotency_key==idempotency_key))
    if existing:
        return existing
    side = payload.side.strip().upper()
    tx_status = payload.status.strip().upper()
    if side not in {"BUY", "SELL"}:
        raise HTTPException(422, "side must be BUY or SELL")
    if tx_status not in {"MATCHED", "FILLED", "CANCELLED", "PENDING", "REJECTED"}:
        raise HTTPException(422, "invalid transaction status")
    if payload.quantity <= 0:
        raise HTTPException(422, "quantity must be greater than zero")
    fees = FeeBreakdown(
        commission=payload.commission, trading_fee=payload.trading_fee,
        clearing_fee=payload.clearing_fee, regulatory_fee=payload.regulatory_fee,
        cat_fee=payload.cat_fee, sec_fee=payload.sec_fee, taf_fee=payload.taf_fee,
        vat=payload.vat,
    )
    try:
        trading_value, total_fees, net_amount = calculate_transaction(side, payload.quantity, payload.execution_price, fees)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    if tx_status in {"FILLED", "MATCHED"}:
        if side == "SELL":
            if payload.quantity > holding.quantity:
                raise HTTPException(422, "sell quantity exceeds holding quantity")
            holding.quantity -= payload.quantity
        else:
            old_cost = holding.quantity * holding.average_cost
            holding.quantity += payload.quantity
            holding.average_cost = (old_cost + net_amount) / holding.quantity
    fx_rate = payload.fx_rate
    if holding.currency == "USD" and fx_rate is not None:
        trading_value_thb = payload.trading_value_thb if payload.trading_value_thb is not None else convert_to_thb(trading_value, "USD", fx_rate)
        net_amount_thb = payload.net_amount_thb if payload.net_amount_thb is not None else convert_to_thb(net_amount, "USD", fx_rate)
    else:
        trading_value_thb = payload.trading_value_thb if payload.trading_value_thb is not None else trading_value
        net_amount_thb = payload.net_amount_thb if payload.net_amount_thb is not None else net_amount
    row = PortfolioTransaction(
        user_id=user.id, holding_id=holding.id, idempotency_key=idempotency_key,
        side=side, status=tx_status, order_id=payload.order_id, quantity=payload.quantity,
        execution_price=payload.execution_price, trading_value=trading_value,
        trading_value_thb=trading_value_thb, commission=payload.commission,
        trading_fee=payload.trading_fee, clearing_fee=payload.clearing_fee,
        regulatory_fee=payload.regulatory_fee, cat_fee=payload.cat_fee,
        sec_fee=payload.sec_fee, taf_fee=payload.taf_fee, vat=payload.vat,
        fx_rate=fx_rate, net_amount=net_amount, net_amount_thb=net_amount_thb,
        currency=holding.currency, executed_at=payload.executed_at or datetime.now(timezone.utc)
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        existing = db.scalar(select(PortfolioTransaction).where(PortfolioTransaction.user_id==user.id, PortfolioTransaction.idempotency_key==idempotency_key))
        if existing:
            return existing
        raise
    db.refresh(row)
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
    row.enabled = False
    row.updated_at = datetime.now(timezone.utc)
    db.commit()

@app.get("/api/v1/watchlist", response_model=list[WatchlistOut])
def list_watchlist(db: Session=Depends(get_db), user: User=Depends(current_user)):
    rows = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id==user.id).order_by(WatchlistItem.market, WatchlistItem.symbol)).all()
    result=[]
    for row in rows:
        rule=db.scalar(select(AlertRule).where(AlertRule.watchlist_item_id==row.id))
        result.append({"id":row.id,"market":row.market,"symbol":row.symbol,"enabled":row.enabled,"upper_percent":rule.upper_percent if rule else None,"lower_percent":rule.lower_percent if rule else None,"upper_price":rule.upper_price if rule else None,"lower_price":rule.lower_price if rule else None})
    return result

@app.post("/api/v1/watchlist", response_model=WatchlistOut, status_code=201)
def create_watchlist(payload: WatchlistCreate, db: Session=Depends(get_db), user: User=Depends(current_user)):
    market,symbol=normalize_market_symbol(payload.market,payload.symbol)
    exists=db.scalar(select(WatchlistItem).where(WatchlistItem.user_id==user.id,WatchlistItem.market==market,WatchlistItem.symbol==symbol))
    if exists: raise HTTPException(409,"watchlist item already exists")
    row=WatchlistItem(user_id=user.id,market=market,symbol=symbol,enabled=payload.enabled); db.add(row); db.flush()
    rule=AlertRule(watchlist_item_id=row.id,upper_percent=payload.upper_percent,lower_percent=payload.lower_percent,upper_price=payload.upper_price,lower_price=payload.lower_price,enabled=True); db.add(rule)
    db.commit(); db.refresh(row)
    return {"id":row.id,"market":row.market,"symbol":row.symbol,"enabled":row.enabled,"upper_percent":rule.upper_percent,"lower_percent":rule.lower_percent,"upper_price":rule.upper_price,"lower_price":rule.lower_price}

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
    rule.upper_price,rule.lower_price=payload.upper_price,payload.lower_price
    db.commit(); db.refresh(row)
    return {"id":row.id,"market":row.market,"symbol":row.symbol,"enabled":row.enabled,"upper_percent":rule.upper_percent,"lower_percent":rule.lower_percent,"upper_price":rule.upper_price,"lower_price":rule.lower_price}

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
    return db.scalars(select(AlertHistory).where(AlertHistory.user_id==user.id).order_by(AlertHistory.triggered_at.desc()).limit(limit)).all()

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
    zero = Decimal("0")
    totals = {"THB": {"cost_basis": zero, "current_value": zero, "pnl": zero, "realized_pnl": zero, "unrealized_pnl": zero}, "USD": {"cost_basis": zero, "current_value": zero, "pnl": zero, "realized_pnl": zero, "unrealized_pnl": zero}}
    rows = []
    now = datetime.now(timezone.utc)
    for h in holdings:
        cost = h.quantity * h.average_cost
        q = qmap.get((h.market,h.symbol))
        current = h.quantity * q.price if q else None
        unrealized = current - cost if current is not None else None
        realized = zero
        running_qty = zero
        running_cost = zero
        txs = db.scalars(select(PortfolioTransaction).where(PortfolioTransaction.holding_id==h.id, PortfolioTransaction.status.in_(["FILLED", "MATCHED"])).order_by(PortfolioTransaction.executed_at, PortfolioTransaction.created_at)).all()
        for tx in txs:
            qty = tx.quantity
            if tx.side == "BUY":
                running_qty += qty
                running_cost += tx.net_amount
            elif tx.side == "SELL" and running_qty > zero:
                avg_open = running_cost / running_qty
                sold_qty = min(qty, running_qty)
                realized += tx.net_amount - (avg_open * sold_qty)
                running_qty -= sold_qty
                running_cost -= avg_open * sold_qty
        currency = h.currency
        totals[currency]["cost_basis"] += cost
        totals[currency]["realized_pnl"] += realized
        if current is not None:
            totals[currency]["current_value"] += current
            totals[currency]["unrealized_pnl"] += unrealized
        totals[currency]["pnl"] = totals[currency]["realized_pnl"] + totals[currency]["unrealized_pnl"]
        total_pnl = (unrealized + realized) if unrealized is not None else realized
        rows.append({"id": str(h.id), "market": h.market, "symbol": h.symbol, "currency": currency, "cost_basis": cost, "current_value": current, "pnl": total_pnl, "pnl_percent": (total_pnl / cost * Decimal("100")) if cost else None, "realized_pnl": realized, "unrealized_pnl": unrealized, "stale": bool(q and (now-q.quoted_at).total_seconds()>300)})
    return {"rows": rows, "totals": totals}

@app.get("/api/v1/market/search")
async def market_search(q: str = Query(..., min_length=1, max_length=80), market: str = Query("TH"), db: Session = Depends(get_db)):
    market = market.strip().upper()
    local = db.scalars(select(StockMaster).where(StockMaster.market == market, StockMaster.active.is_(True), (StockMaster.symbol.ilike("%"+q.strip()+"%") | StockMaster.name.ilike("%"+q.strip()+"%"))).order_by(StockMaster.symbol).limit(8)).all()
    if local:
        return [{"symbol":x.symbol,"name":x.name,"exchange":x.exchange,"market":x.market,"currency":x.currency} for x in local]
    try:
        results = await search_symbols(q, market)
        for x in results:
            row = db.scalar(select(StockMaster).where(StockMaster.market==market, StockMaster.symbol==x["symbol"]))
            if not row:
                row = StockMaster(market=market, symbol=x["symbol"], name=x["name"], exchange=x.get("exchange"), currency=x["currency"], source="yahoo")
                db.add(row)
            else:
                row.name=x["name"]; row.exchange=x.get("exchange"); row.currency=x["currency"]; row.active=True; row.synced_at=datetime.now(timezone.utc)
        db.commit()
        return results
    except Exception as exc:
        raise HTTPException(502, f"market search failed: {exc}")

@app.get("/api/v1/market/stocks/status")
def stock_master_status(db: Session = Depends(get_db), user: User = Depends(current_user)):
    total = db.scalar(select(func.count(StockMaster.id)).where(StockMaster.active.is_(True))) or 0
    th = db.scalar(select(func.count(StockMaster.id)).where(StockMaster.active.is_(True), StockMaster.market == "TH")) or 0
    us = db.scalar(select(func.count(StockMaster.id)).where(StockMaster.active.is_(True), StockMaster.market == "US")) or 0
    latest = db.scalar(select(func.max(StockMaster.synced_at)).where(StockMaster.active.is_(True)))
    return {"total": total, "TH": th, "US": us, "last_synced_at": latest}

@app.post("/api/v1/market/stocks/sync")
async def sync_stock_master(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(select(StockMaster).where(StockMaster.active.is_(True))).all()
    tracked = db.scalars(select(PortfolioHolding).where(PortfolioHolding.user_id==user.id)).all() + db.scalars(select(WatchlistItem).where(WatchlistItem.user_id==user.id)).all()
    keys = {(x.market, x.symbol) for x in rows} | {(x.market, x.symbol) for x in tracked}
    updated = added = failed = 0
    for market, symbol in sorted(keys):
        try:
            results = await search_symbols(symbol, market, limit=8)
            match = next((x for x in results if x["symbol"] == symbol), results[0] if results else None)
            if not match: failed += 1; continue
            row = db.scalar(select(StockMaster).where(StockMaster.market==market, StockMaster.symbol==symbol))
            if not row:
                row = StockMaster(market=market, symbol=symbol, name=match["name"], exchange=match.get("exchange"), currency=match["currency"], source="yahoo")
                db.add(row); added += 1
            else:
                row.name=match["name"]; row.exchange=match.get("exchange"); row.currency=match["currency"]; row.active=True; row.synced_at=datetime.now(timezone.utc); updated += 1
        except Exception:
            failed += 1
    db.commit()
    return {"status":"ok" if failed == 0 else "partial", "updated":updated, "added":added, "failed":failed, "total":len(keys), "synced_at":datetime.now(timezone.utc).isoformat()}

@app.get("/api/v1/fx/usd-thb")
async def usd_thb_fx(db: Session = Depends(get_db)):
    row = db.scalar(select(FxRate).where(FxRate.base_currency=="USD", FxRate.quote_currency=="THB"))
    if row:
        age = (datetime.now(timezone.utc)-row.quoted_at).total_seconds()
        return {"base_currency":"USD","quote_currency":"THB","rate":row.rate,"source":row.source,"quoted_at":row.quoted_at,"stale":age > 300,"fallback":row.source != "yahoo","status":"STALE" if age > 300 else ("FALLBACK" if row.source != "yahoo" else "LIVE")}
    raise HTTPException(404, "USD/THB FX rate not available")

@app.post("/api/v1/fx/usd-thb/sync")
async def sync_usd_thb_fx(db: Session = Depends(get_db), user: User = Depends(current_user)):
    from .market.providers import fx_rate
    try:
        rate, quoted_at, source = await fx_rate("USD", "THB")
    except Exception as exc:
        raise HTTPException(502, f"FX provider failed: {exc}")
    row = db.scalar(select(FxRate).where(FxRate.base_currency=="USD", FxRate.quote_currency=="THB"))
    if not row:
        row = FxRate(base_currency="USD", quote_currency="THB", rate=rate, source=source, quoted_at=quoted_at)
        db.add(row)
    else:
        row.rate=rate; row.source=source; row.quoted_at=quoted_at
    db.commit()
    db.refresh(row)
    return {"status":"ok","base_currency":"USD","quote_currency":"THB","rate":row.rate,"source":row.source,"quoted_at":row.quoted_at,"fallback":row.source != "yahoo","synced_at":datetime.now(timezone.utc)}

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


@app.post("/api/v1/internal/alerts/evaluate")
def evaluate_alerts_internal(request: Request, db: Session=Depends(get_db)):
    expected = os.getenv("WORKER_TOKEN", "")
    supplied = request.headers.get("X-Worker-Token", "")
    if not expected or not hmac.compare_digest(supplied, expected):
        raise HTTPException(401, "worker authentication required")
    users = db.scalars(select(User)).all()
    created = []
    for user in users:
        created.extend(evaluate_alerts(db, user))
    return {"created": len(created), "alerts": [{"id": str(x.id), "market": x.market, "symbol": x.symbol, "type": x.alert_type, "change_percent": x.change_percent} for x in created]}


@app.post("/api/v1/alerts/evaluate")
def evaluate_alerts_api(db: Session=Depends(get_db), user: User=Depends(current_user)):
    rows = evaluate_alerts(db, user)
    return {"created": len(rows), "alerts": [{"id": str(x.id), "market": x.market, "symbol": x.symbol, "type": x.alert_type, "change_percent": x.change_percent} for x in rows]}
