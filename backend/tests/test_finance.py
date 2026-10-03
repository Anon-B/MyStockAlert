from decimal import Decimal

import pytest

from app.finance import FeeBreakdown, calculate_transaction, convert_to_thb


def test_buy_net_amount_adds_all_fees():
    fees = FeeBreakdown(
        commission=Decimal("10"),
        trading_fee=Decimal("0.35"),
        clearing_fee=Decimal("0.10"),
        regulatory_fee=Decimal("0.05"),
        vat=Decimal("0.735"),
    )
    trading, total, net = calculate_transaction(
        "BUY", Decimal("100"), Decimal("32.50"), fees
    )
    assert trading == Decimal("3250.00000000")
    assert total == Decimal("11.23500000")
    assert net == Decimal("3261.23500000")


def test_sell_net_amount_subtracts_all_fees():
    fees = FeeBreakdown(commission=Decimal("10"), taf_fee=Decimal("0.50"))
    _, total, net = calculate_transaction(
        "SELL", Decimal("100"), Decimal("32.50"), fees
    )
    assert total == Decimal("10.50000000")
    assert net == Decimal("3239.50000000")


def test_fractional_precision_is_supported_to_seven_decimals():
    trading, _, _ = calculate_transaction(
        "BUY", Decimal("0.9395361"), Decimal("245.30"), FeeBreakdown()
    )
    assert trading == Decimal("230.46820533")


def test_usd_to_thb_requires_decimal_fx():
    assert convert_to_thb(Decimal("230.46820533"), "USD", Decimal("33.39")) == Decimal("7695.33337597")
    with pytest.raises(ValueError):
        convert_to_thb(Decimal("1"), "USD", None)
