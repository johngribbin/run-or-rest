from decimal import Decimal

from run_or_rest.core.models import Decision, DecisionContext
from run_or_rest.core.strategies import (
    always_on,
    strike_peak_guard,
    strike_price,
)


def context(
    previous_price: str = "40",
    breakeven: str = "100",
    previous_load: str = "50000",
    previous_month_peak: str = "80000",
    month_to_date_peak: str = "0",
) -> DecisionContext:
    return DecisionContext(
        previous_price_usd_per_mwh=Decimal(previous_price),
        previous_load_mw=Decimal(previous_load),
        breakeven_estimate_usd_per_mwh=Decimal(breakeven),
        previous_month_peak_mw=Decimal(previous_month_peak),
        month_to_date_peak_mw=Decimal(month_to_date_peak),
        peak_guard_threshold=Decimal("0.95"),
    )


def test_always_on_runs_even_above_breakeven() -> None:
    assert always_on(context(previous_price="500")) is Decision.RUN


def test_strike_price_runs_below_breakeven() -> None:
    assert strike_price(context(previous_price="99.99")) is Decision.RUN


def test_strike_price_runs_exactly_at_breakeven() -> None:
    assert strike_price(context(previous_price="100")) is Decision.RUN


def test_strike_price_is_off_above_breakeven() -> None:
    assert strike_price(context(previous_price="100.01")) is Decision.OFF


def test_peak_guard_fires_at_95_percent_of_previous_month_peak() -> None:
    assert strike_peak_guard(context(previous_load="76000")) is Decision.OFF


def test_peak_guard_does_not_fire_just_below_threshold() -> None:
    assert strike_peak_guard(context(previous_load="75999")) is Decision.RUN


def test_peak_guard_uses_month_to_date_peak_when_higher() -> None:
    higher_month = context(previous_load="85000", month_to_date_peak="90000")

    assert strike_peak_guard(higher_month) is Decision.RUN
    assert strike_peak_guard(context(previous_load="85000")) is Decision.OFF


def test_peak_guard_strategy_follows_strike_price_off() -> None:
    assert strike_peak_guard(context(previous_price="100.01")) is Decision.OFF
