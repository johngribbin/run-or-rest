from decimal import Decimal

from run_or_rest.core.months import MonthKey
from run_or_rest.core.peaks import FourCpPeak, peak_price_range
from tests.core.builders import chicago


def peak(month: int, price: str) -> FourCpPeak:
    return FourCpPeak(
        month=MonthKey(2026, month),
        start=chicago(2026, month, 15, 16),
        load_mw=Decimal(60_000),
        price_usd_per_mwh=Decimal(price),
    )


def test_peak_price_range_spans_the_lowest_and_highest_peak_price() -> None:
    price_range = peak_price_range(
        [peak(6, "41.10"), peak(7, "500.00"), peak(8, "20.53")],
    )

    assert price_range.lowest_usd_per_mwh == Decimal("20.53")
    assert price_range.highest_usd_per_mwh == Decimal("500.00")
