import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PortfolioCreate(BaseModel):
    """Create a portfolio holding shell; position values come from transactions."""
    market: str
    symbol: str
    currency: str
    enabled: bool = True
    quantity: Decimal = Field(default=Decimal("0"), ge=0)
    average_cost: Decimal = Field(default=Decimal("0"), ge=0)

class PortfolioUpdate(PortfolioCreate):
    pass

class PortfolioTransactionCreate(BaseModel):
    side: str
    status: str = "FILLED"
    order_id: str | None = None
    quantity: Decimal = Field(gt=0, decimal_places=7)
    execution_price: Decimal = Field(gt=0)
    commission: Decimal = Field(default=0, ge=0)
    trading_fee: Decimal = Field(default=0, ge=0)
    clearing_fee: Decimal = Field(default=0, ge=0)
    regulatory_fee: Decimal = Field(default=0, ge=0)
    cat_fee: Decimal = Field(default=0, ge=0)
    sec_fee: Decimal = Field(default=0, ge=0)
    taf_fee: Decimal = Field(default=0, ge=0)
    vat: Decimal = Field(default=0, ge=0)
    fx_rate: Decimal | None = Field(default=None, gt=0)
    net_amount_thb: Decimal | None = Field(default=None, ge=0)
    trading_value_thb: Decimal | None = Field(default=None, ge=0)
    executed_at: datetime | None = None

class PortfolioTransactionOut(ORMModel):
    id: uuid.UUID
    holding_id: uuid.UUID
    user_id: uuid.UUID
    idempotency_key: str | None
    side: str
    status: str
    order_id: str | None
    quantity: Decimal
    execution_price: Decimal
    trading_value: Decimal
    trading_value_thb: Decimal | None
    commission: Decimal
    trading_fee: Decimal
    clearing_fee: Decimal
    regulatory_fee: Decimal
    cat_fee: Decimal
    sec_fee: Decimal
    taf_fee: Decimal
    vat: Decimal
    net_amount_thb: Decimal | None
    fx_rate: Decimal | None
    net_amount: Decimal
    currency: str
    executed_at: datetime
    created_at: datetime

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
    upper_price: Decimal | None = Field(default=None, gt=0)
    lower_price: Decimal | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_rules(self):
        if self.upper_percent is None and self.upper_price is None and self.lower_percent is None and self.lower_price is None:
            raise ValueError("ต้องกำหนดเงื่อนไขแจ้งเตือนอย่างน้อย 1 รายการ")
        if self.upper_percent is not None and self.upper_price is not None:
            raise ValueError("เงื่อนไขด้านบนเลือกได้อย่างใดอย่างหนึ่งระหว่าง % หรือราคา")
        if self.lower_percent is not None and self.lower_price is not None:
            raise ValueError("เงื่อนไขด้านล่างเลือกได้อย่างใดอย่างหนึ่งระหว่าง % หรือราคา")
        return self

class WatchlistUpdate(WatchlistCreate):
    pass

class WatchlistOut(ORMModel):
    id: uuid.UUID
    market: str
    symbol: str
    enabled: bool
    upper_percent: Decimal | None = None
    lower_percent: Decimal | None = None
    upper_price: Decimal | None = None
    lower_price: Decimal | None = None
    current_price: Decimal | None = None
    current_currency: str | None = None
    current_change_percent: Decimal | None = None
    quoted_at: datetime | None = None
    quote_stale: bool = True

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
    provider: str | None = None
    delivery_status: str | None = None

class StockSearchOut(BaseModel):
    symbol: str
    name: str
    exchange: str | None = None
    market: str
    currency: str

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
