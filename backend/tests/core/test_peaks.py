from decimal import Decimal

from run_or_rest.core.months import MonthKey
from run_or_rest.core.peaks import (
    FourCpPeak,
    charge_per_peak_usd,
    peak_price_range,
    transmission_usd,
)
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


def test_transmission_at_zero_one_and_four_of_four_peaks() -> None:
    rate = Decimal(50_000)

    assert transmission_usd(rate, Decimal(1), 0, 4) == Decimal(0)
    assert transmission_usd(rate, Decimal(1), 1, 4) == Decimal(12_500)
    assert transmission_usd(rate, Decimal(1), 4, 4) == Decimal(50_000)


def test_charge_for_running_at_one_of_four_peaks() -> None:
    assert charge_per_peak_usd(Decimal(50_000), Decimal(1), 4) == Decimal(12_500)
