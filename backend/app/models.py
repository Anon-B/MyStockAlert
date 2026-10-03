import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(64))
    resource_id: Mapped[str | None] = mapped_column(String(128))
    ip_address: Mapped[str | None] = mapped_column(String(64))
    event_data: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    market: Mapped[str] = mapped_column(String(10), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    average_cost: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PortfolioTransaction(Base):
    __tablename__ = "portfolio_transactions"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_portfolio_tx_user_idempotency"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    holding_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("portfolio_holdings.id", ondelete="CASCADE"), nullable=False)
    side: Mapped[str] = mapped_column(String(4), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="MATCHED", nullable=False)
    order_id: Mapped[str | None] = mapped_column(String(100))
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    execution_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    trading_value: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    trading_value_thb: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    commission: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    trading_fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    clearing_fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    regulatory_fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    cat_fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    sec_fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    taf_fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    vat: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=0, nullable=False)
    fx_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    net_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    net_amount_thb: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("user_id", "market", "symbol"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    market: Mapped[str] = mapped_column(String(10), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
class AlertRule(Base):
    __tablename__ = "alert_rules"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watchlist_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("watchlist_items.id", ondelete="CASCADE"), unique=True, nullable=False)
    upper_percent: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))
    lower_percent: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))
    upper_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    lower_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    upper_armed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lower_armed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AlertHistory(Base):
    __tablename__ = "alert_history"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    market: Mapped[str] = mapped_column(String(10), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    trigger_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    change_percent: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    message: Mapped[str | None] = mapped_column(Text)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retry_count: Mapped[int] = mapped_column(default=0, nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    provider: Mapped[str | None] = mapped_column(String(64))
    delivery_status: Mapped[str | None] = mapped_column(String(32))

class AlertOutbox(Base):
    __tablename__ = "alert_outbox"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_history_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("alert_history.id", ondelete="CASCADE"), unique=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(32), default="line", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Setting(Base):
    __tablename__ = "settings"
    __table_args__ = (UniqueConstraint("user_id", "key"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value_encrypted_or_json: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class FxRate(Base):
    __tablename__ = "fx_rates"
    __table_args__ = (UniqueConstraint("base_currency", "quote_currency"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    quote_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(20, 10), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    quoted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class StockMaster(Base):
    __tablename__ = "stock_master"
    __table_args__ = (UniqueConstraint("market", "symbol"), Index("ix_stock_master_market_symbol", "market", "symbol"))
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    market: Mapped[str] = mapped_column(String(10), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    exchange: Mapped[str | None] = mapped_column(String(64))
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="yahoo")
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class MarketQuote(Base):
    __tablename__ = "market_quotes"
    __table_args__ = (UniqueConstraint("market", "symbol"), Index("ix_market_quotes_market_symbol_updated", "market", "symbol", "updated_at"))
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    market: Mapped[str] = mapped_column(String(10), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    change_percent: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    quoted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
