from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from run_or_rest.core.economics import (
    breakeven_usd_per_mwh,
    interval_net_sats,
    revenue_usd,
)
from run_or_rest.core.models import (
    Assumptions,
    BacktestError,
    DecisionContext,
    HistoryInterval,
    WindowInterval,
)
from run_or_rest.core.months import MonthKey, month_of, previous_month
from run_or_rest.core.timestamps import utc_text


@dataclass(frozen=True)
class SettledInterval:
    interval: WindowInterval
    price_usd_per_mwh: Decimal
    load_mw: Decimal
    context: DecisionContext


@dataclass
class _Observed:
    price_usd_per_mwh: Decimal | None = None
    load_mw: Decimal | None = None
    month_peaks_mw: dict[MonthKey, Decimal] = field(
        default_factory=dict[MonthKey, Decimal]
    )

    def observe(
        self,
        start: datetime,
        price_usd_per_mwh: Decimal | None,
        load_mw: Decimal | None,
    ) -> None:
        if price_usd_per_mwh is not None:
            self.price_usd_per_mwh = price_usd_per_mwh
        if load_mw is not None:
            self.load_mw = load_mw
            month = month_of(start)
            self.month_peaks_mw[month] = max(
                load_mw,
                self.month_peaks_mw.get(month, load_mw),
            )


def _require(value: Decimal | None, missing: str, start: datetime) -> Decimal:
    if value is None:
        msg = f"No {missing} before the interval starting {utc_text(start)}"
        raise BacktestError(msg)
    return value


def breakeven_estimate(
    interval: WindowInterval,
    assumptions: Assumptions,
) -> Decimal:
    day = interval.previous_day
    sats = interval_net_sats(assumptions, interval.difficulty, day)
    revenue = revenue_usd(sats, day.btc_price_usd)
    return breakeven_usd_per_mwh(revenue, assumptions.fleet_mw)


def _context(
    observed: _Observed,
    interval: WindowInterval,
    assumptions: Assumptions,
) -> DecisionContext:
    month = month_of(interval.start)
    previous_peak = observed.month_peaks_mw.get(previous_month(month))
    return DecisionContext(
        previous_price_usd_per_mwh=_require(
            observed.price_usd_per_mwh,
            "price",
            interval.start,
        ),
        previous_load_mw=_require(observed.load_mw, "load", interval.start),
        breakeven_estimate_usd_per_mwh=breakeven_estimate(interval, assumptions),
        previous_month_peak_mw=_require(
            previous_peak,
            "load in the previous month",
            interval.start,
        ),
        month_to_date_peak_mw=observed.month_peaks_mw.get(month, Decimal(0)),
        peak_guard_threshold=assumptions.peak_guard_threshold,
    )


def settled_intervals(
    history: Sequence[HistoryInterval],
    window: Sequence[WindowInterval],
    assumptions: Assumptions,
) -> list[SettledInterval]:
    observed = _Observed()
    for past in history:
        observed.observe(past.start, past.price_usd_per_mwh, past.load_mw)
    settled: list[SettledInterval] = []
    for interval in window:
        price = interval.price_usd_per_mwh
        load = interval.load_mw
        if price is not None and load is not None:
            context = _context(observed, interval, assumptions)
            settled.append(SettledInterval(interval, price, load, context))
        observed.observe(interval.start, price, load)
    return settled
