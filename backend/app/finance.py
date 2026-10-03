from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

MONEY_SCALE = Decimal("0.00000001")
ZERO = Decimal("0")

@dataclass(frozen=True)
class FeeBreakdown:
    commission: Decimal = ZERO
    trading_fee: Decimal = ZERO
    clearing_fee: Decimal = ZERO
    regulatory_fee: Decimal = ZERO
    cat_fee: Decimal = ZERO
    sec_fee: Decimal = ZERO
    taf_fee: Decimal = ZERO
    vat: Decimal = ZERO

    @property
    def total(self) -> Decimal:
        return sum((
            self.commission, self.trading_fee, self.clearing_fee,
            self.regulatory_fee, self.cat_fee, self.sec_fee,
            self.taf_fee, self.vat,
        ), ZERO)

def q(value: Decimal) -> Decimal:
    return value.quantize(MONEY_SCALE, rounding=ROUND_HALF_UP)

def calculate_transaction(
    side: str,
    quantity: Decimal,
    execution_price: Decimal,
    fees: FeeBreakdown,
) -> tuple[Decimal, Decimal, Decimal]:
    side = side.upper()
    if side not in {"BUY", "SELL"}:
        raise ValueError("side must be BUY or SELL")
    if quantity <= ZERO or execution_price <= ZERO:
        raise ValueError("quantity and execution_price must be greater than zero")
    trading_value = q(quantity * execution_price)
    total_fees = q(fees.total)
    net_amount = q(trading_value + total_fees if side == "BUY" else trading_value - total_fees)
    if net_amount < ZERO:
        raise ValueError("net amount cannot be negative")
    return trading_value, total_fees, net_amount

def convert_to_thb(amount: Decimal, currency: str, fx_rate: Decimal | None) -> Decimal:
    if currency.upper() == "THB":
        return q(amount)
    if not fx_rate or fx_rate <= ZERO:
        raise ValueError("fx_rate is required for USD transactions converted to THB")
    return q(amount * fx_rate)
