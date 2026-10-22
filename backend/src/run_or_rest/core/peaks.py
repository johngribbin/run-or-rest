from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from run_or_rest.core.models import BacktestError, WindowInterval
from run_or_rest.core.months import MonthKey, month_of


@dataclass(frozen=True)
class FourCpPeak:
    month: MonthKey
    start: datetime
    load_mw: Decimal


@dataclass(frozen=True)
class _Candidate:
    start: datetime
    load_mw: Decimal
    price_usd_per_mwh: Decimal | None


def _highest_load_by_month(
    window: Sequence[WindowInterval],
) -> dict[MonthKey, _Candidate | None]:
    highest: dict[MonthKey, _Candidate | None] = {}
    for interval in window:
        month = month_of(interval.start)
        best = highest.setdefault(month, None)
        load = interval.load_mw
        if load is not None and (best is None or load > best.load_mw):
            highest[month] = _Candidate(
                interval.start,
                load,
                interval.price_usd_per_mwh,
            )
    return highest


def _peak(month: MonthKey, candidate: _Candidate | None) -> FourCpPeak:
    if candidate is None:
        msg = f"No system load in month {month.year}-{month.month:02d}"
        raise BacktestError(msg)
    if candidate.price_usd_per_mwh is None:
        msg = f"4CP peak interval {candidate.start.isoformat()} has no price"
        raise BacktestError(msg)
    return FourCpPeak(month, candidate.start, candidate.load_mw)


def fourcp_peaks(window: Sequence[WindowInterval]) -> list[FourCpPeak]:
    return [
        _peak(month, candidate)
        for month, candidate in _highest_load_by_month(window).items()
    ]


def transmission_usd(
    rate_usd_per_mw_year: Decimal,
    fleet_mw: Decimal,
    peaks_running: int,
    peak_months: int,
) -> Decimal:
    return rate_usd_per_mw_year * fleet_mw * peaks_running / peak_months
