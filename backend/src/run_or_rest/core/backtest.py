from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from run_or_rest.config import INTERVAL_HOURS
from run_or_rest.core.bitcoin import (
    BitcoinDay,
    DifficultyAdjustment,
    bitcoin_days,
    difficulty_adjustments,
)
from run_or_rest.core.context import SettledInterval, settled_intervals
from run_or_rest.core.economics import (
    energy_cost_usd,
    hashrate_hs,
    interval_net_sats,
    revenue_usd,
)
from run_or_rest.core.models import (
    Assumptions,
    BacktestError,
    Decision,
    HistoryInterval,
    Sats,
    StrategyId,
    WindowInterval,
)
from run_or_rest.core.peaks import (
    FourCpPeak,
    charge_per_peak_usd,
    fourcp_peaks,
    transmission_usd,
)
from run_or_rest.core.strategies import STRATEGIES, Strategy
from run_or_rest.core.timestamps import interval_starts


@dataclass(frozen=True)
class Gain:
    price_usd: Decimal
    fourcp_usd: Decimal
    total_usd: Decimal


@dataclass(frozen=True)
class StrategyResult:
    id: StrategyId
    label: str
    revenue_usd: Decimal
    energy_cost_usd: Decimal
    transmission_usd: Decimal
    net_profit_usd: Decimal
    mined_sats: Sats
    hours_off: Decimal
    peaks_running: int
    gain_vs_always_on: Gain


@dataclass(frozen=True)
class SeriesPoint:
    start: datetime
    price_usd_per_mwh: Decimal
    breakeven_estimate_usd_per_mwh: Decimal
    decisions: Mapping[StrategyId, Decision]


@dataclass(frozen=True)
class PeakOutcome:
    peak: FourCpPeak
    decisions: Mapping[StrategyId, Decision]


@dataclass(frozen=True)
class BacktestResult:
    window_start: datetime
    window_end: datetime
    assumptions: Assumptions
    strategies: tuple[StrategyResult, ...]
    winner: StrategyId
    winner_advantage_usd: Decimal
    charge_per_peak_usd: Decimal
    fourcp_peaks: tuple[PeakOutcome, ...]
    series: tuple[SeriesPoint, ...]
    bitcoin_days: tuple[BitcoinDay, ...]
    difficulty_adjustments: tuple[DifficultyAdjustment, ...]
    expected_intervals: int
    missing_intervals: int


@dataclass(frozen=True)
class _Totals:
    strategy: Strategy
    revenue_usd: Decimal
    energy_cost_usd: Decimal
    transmission_usd: Decimal
    net_profit_usd: Decimal
    mined_sats: Sats
    hours_off: Decimal
    peaks_running: int


@dataclass(frozen=True)
class _Settlement:
    point: SeriesPoint
    sats: Sats
    revenue_usd: Decimal
    energy_cost_usd: Decimal


def _check_ranges(
    history: Sequence[HistoryInterval],
    window: Sequence[WindowInterval],
    window_start: datetime,
    window_end: datetime,
) -> int:
    slots = interval_starts(window_start, window_end)
    if [interval.start for interval in window] != slots:
        msg = "Window intervals must cover every interval of the window in order"
        raise BacktestError(msg)
    starts = [interval.start for interval in history]
    if starts != sorted(set(starts)) or any(start >= window_start for start in starts):
        msg = "History intervals must be unique, in order and before the window"
        raise BacktestError(msg)
    return len(slots)


def _settle(
    settled: SettledInterval,
    assumptions: Assumptions,
    hashrate: int,
) -> _Settlement:
    interval = settled.interval
    sats = interval_net_sats(
        hashrate,
        assumptions.pool_fee_rate,
        interval.difficulty,
        interval.day,
    )
    point = SeriesPoint(
        start=interval.start,
        price_usd_per_mwh=settled.price_usd_per_mwh,
        breakeven_estimate_usd_per_mwh=settled.context.breakeven_estimate_usd_per_mwh,
        decisions={
            strategy.id: strategy.decide(settled.context) for strategy in STRATEGIES
        },
    )
    return _Settlement(
        point=point,
        sats=sats,
        revenue_usd=revenue_usd(sats, interval.day.btc_price_usd),
        energy_cost_usd=energy_cost_usd(
            assumptions.fleet_mw,
            settled.price_usd_per_mwh,
        ),
    )


def _split_by_decision(
    strategy_id: StrategyId,
    settlements: Sequence[_Settlement],
) -> tuple[list[_Settlement], int]:
    running = [
        settlement
        for settlement in settlements
        if settlement.point.decisions[strategy_id] is Decision.RUN
    ]
    intervals_off = sum(
        1
        for settlement in settlements
        if settlement.point.decisions[strategy_id] is Decision.OFF
    )
    return running, intervals_off


def _totals(
    strategy: Strategy,
    settlements: Sequence[_Settlement],
    peak_starts: frozenset[datetime],
    assumptions: Assumptions,
) -> _Totals:
    running, intervals_off = _split_by_decision(strategy.id, settlements)
    revenue = sum((settlement.revenue_usd for settlement in running), Decimal(0))
    cost = sum((settlement.energy_cost_usd for settlement in running), Decimal(0))
    peaks_running = sum(
        1 for settlement in running if settlement.point.start in peak_starts
    )
    transmission = transmission_usd(
        assumptions.transmission_rate_usd_per_mw_year,
        assumptions.fleet_mw,
        peaks_running,
        len(peak_starts),
    )
    return _Totals(
        strategy=strategy,
        revenue_usd=revenue,
        energy_cost_usd=cost,
        transmission_usd=transmission,
        net_profit_usd=revenue - cost - transmission,
        mined_sats=Sats(sum(settlement.sats for settlement in running)),
        hours_off=intervals_off * INTERVAL_HOURS,
        peaks_running=peaks_running,
    )


def _result(totals: _Totals, baseline: _Totals) -> StrategyResult:
    gain = Gain(
        price_usd=(baseline.energy_cost_usd - totals.energy_cost_usd)
        - (baseline.revenue_usd - totals.revenue_usd),
        fourcp_usd=baseline.transmission_usd - totals.transmission_usd,
        total_usd=totals.net_profit_usd - baseline.net_profit_usd,
    )
    return StrategyResult(
        id=totals.strategy.id,
        label=totals.strategy.label,
        revenue_usd=totals.revenue_usd,
        energy_cost_usd=totals.energy_cost_usd,
        transmission_usd=totals.transmission_usd,
        net_profit_usd=totals.net_profit_usd,
        mined_sats=totals.mined_sats,
        hours_off=totals.hours_off,
        peaks_running=totals.peaks_running,
        gain_vs_always_on=gain,
    )


def _peak_outcomes(
    peaks: Sequence[FourCpPeak],
    series: Sequence[SeriesPoint],
) -> tuple[PeakOutcome, ...]:
    decisions = {point.start: point.decisions for point in series}
    return tuple(PeakOutcome(peak, decisions[peak.start]) for peak in peaks)


def _winner(results: Sequence[StrategyResult]) -> StrategyResult:
    tie_break_order = list(StrategyId)
    return max(
        results,
        key=lambda result: (
            result.net_profit_usd,
            -tie_break_order.index(result.id),
        ),
    )


def run_backtest(
    history: Sequence[HistoryInterval],
    window: Sequence[WindowInterval],
    window_start: datetime,
    window_end: datetime,
    assumptions: Assumptions,
) -> BacktestResult:
    expected = _check_ranges(history, window, window_start, window_end)
    hashrate = hashrate_hs(assumptions.fleet_mw, assumptions.efficiency_j_per_th)
    settled = settled_intervals(history, window, assumptions, hashrate)
    peaks = fourcp_peaks(window)
    peak_starts = frozenset(peak.start for peak in peaks)
    settlements = [_settle(interval, assumptions, hashrate) for interval in settled]
    totals = {
        strategy.id: _totals(strategy, settlements, peak_starts, assumptions)
        for strategy in STRATEGIES
    }
    series = tuple(settlement.point for settlement in settlements)
    baseline = totals[StrategyId.ALWAYS_ON]
    results = tuple(_result(each, baseline) for each in totals.values())
    winner = _winner(results)
    return BacktestResult(
        window_start=window_start,
        window_end=window_end,
        assumptions=assumptions,
        strategies=results,
        winner=winner.id,
        winner_advantage_usd=winner.gain_vs_always_on.total_usd,
        charge_per_peak_usd=charge_per_peak_usd(
            assumptions.transmission_rate_usd_per_mw_year,
            assumptions.fleet_mw,
            len(peaks),
        ),
        fourcp_peaks=_peak_outcomes(peaks, series),
        series=series,
        bitcoin_days=tuple(bitcoin_days(window, assumptions.pool_fee_rate)),
        difficulty_adjustments=tuple(difficulty_adjustments(window)),
        expected_intervals=expected,
        missing_intervals=len(window) - len(settled),
    )
