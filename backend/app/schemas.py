import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PortfolioCreate(BaseModel):
    market: str
    symbol: str
    quantity: Decimal = Field(gt=0)
    average_cost: Decimal = Field(gt=0)
    currency: str
    enabled: bool = True

class PortfolioUpdate(PortfolioCreate):
    pass

class PortfolioOut(ORMModel):
    id: uuid.UUID
    market: str
    symbol: str
    quantity: Decimal
    average_cost: Decimal
    currency: str
    enabled: bool
    created_at: datetime
    updated_at: datetime

class WatchlistCreate(BaseModel):
    market: str
    symbol: str
    enabled: bool = True
    upper_percent: Decimal | None = Field(default=None, gt=0)
    lower_percent: Decimal | None = Field(default=None, lt=0)

class WatchlistUpdate(WatchlistCreate):
    pass

class WatchlistOut(ORMModel):
    id: uuid.UUID
    market: str
    symbol: str
    enabled: bool
    upper_percent: Decimal | None = None
    lower_percent: Decimal | None = None

class SettingIn(BaseModel):
    value: object | None = None

class SettingOut(BaseModel):
    key: str
    value: object | None

class AlertHistoryOut(ORMModel):
    id: uuid.UUID
    symbol: str
    market: str
    alert_type: str
    reference_price: Decimal | None
    trigger_price: Decimal | None
    change_percent: Decimal | None
    message: str | None
    triggered_at: datetime
    sent_at: datetime | None
    delivered_at: datetime | None
    retry_count: int
    last_error: str | None
    status: str

class QuoteOut(BaseModel):
    market: str
    symbol: str
    price: Decimal
    currency: str
    change_percent: Decimal | None
    source: str
    quoted_at: datetime
    stale: bool

class MarketStatusOut(BaseModel):
    market: str
    timezone: str
    trading_day: bool
    open: bool
    local_time: str
    session_open: str | None
    session_close: str | None
