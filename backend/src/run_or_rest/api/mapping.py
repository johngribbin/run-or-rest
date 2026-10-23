from datetime import UTC, datetime
from decimal import ROUND_HALF_EVEN, Decimal

from run_or_rest.api import schemas
from run_or_rest.config import (
    HOURS_DECIMAL_PLACES,
    LOAD_DECIMAL_PLACES,
    PEAK_GUARD_THRESHOLD_DEFAULT,
    PEAK_GUARD_THRESHOLD_MAX,
    PEAK_GUARD_THRESHOLD_MIN,
    PEAK_GUARD_THRESHOLD_STEP,
    PRICE_DECIMAL_PLACES,
    SETTLEMENT_POINT,
    THRESHOLD_DECIMAL_PLACES,
    USD_DECIMAL_PLACES,
)
from run_or_rest.core.backtest import BacktestResult, SeriesPoint, StrategyResult
from run_or_rest.core.peaks import FourCpPeak


def rounded(value: Decimal, places: int) -> str:
    quantized = value.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_EVEN)
    return str(quantized.copy_abs() if quantized.is_zero() else quantized)


def usd(value: Decimal) -> str:
    return rounded(value, USD_DECIMAL_PLACES)


def utc(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _controls() -> schemas.Controls:
    def threshold(value: Decimal) -> str:
        return rounded(value, THRESHOLD_DECIMAL_PLACES)

    return schemas.Controls(
        peak_guard_threshold=schemas.ThresholdControl(
            min=threshold(PEAK_GUARD_THRESHOLD_MIN),
            max=threshold(PEAK_GUARD_THRESHOLD_MAX),
            step=threshold(PEAK_GUARD_THRESHOLD_STEP),
            default=threshold(PEAK_GUARD_THRESHOLD_DEFAULT),
        ),
    )


def _strategy(result: StrategyResult) -> schemas.Strategy:
    gain = result.gain_vs_always_on
    return schemas.Strategy(
        id=result.id,
        label=result.label,
        revenue_usd=usd(result.revenue_usd),
        energy_cost_usd=usd(result.energy_cost_usd),
        transmission_usd=usd(result.transmission_usd),
        net_profit_usd=usd(result.net_profit_usd),
        mined_sats=result.mined_sats,
        hours_off=rounded(result.hours_off, HOURS_DECIMAL_PLACES),
        gain_vs_always_on=schemas.Gain(
            price_usd=usd(gain.price_usd),
            fourcp_usd=usd(gain.fourcp_usd),
            total_usd=usd(gain.total_usd),
        ),
    )


def _peak(peak: FourCpPeak) -> schemas.FourCpPeak:
    return schemas.FourCpPeak(
        month=f"{peak.month.year:04d}-{peak.month.month:02d}",
        interval_start_utc=utc(peak.start),
        system_load_mw=rounded(peak.load_mw, LOAD_DECIMAL_PLACES),
    )


def _point(point: SeriesPoint) -> schemas.SeriesPoint:
    return schemas.SeriesPoint(
        interval_start_utc=utc(point.start),
        price_usd_per_mwh=rounded(point.price_usd_per_mwh, PRICE_DECIMAL_PLACES),
        breakeven_estimate_usd_per_mwh=rounded(
            point.breakeven_estimate_usd_per_mwh,
            PRICE_DECIMAL_PLACES,
        ),
        decisions=schemas.Decisions(
            **{
                strategy.value: decision
                for strategy, decision in point.decisions.items()
            },
        ),
    )


def to_response(result: BacktestResult) -> schemas.BacktestResponse:
    assumptions = result.assumptions
    return schemas.BacktestResponse(
        period=schemas.Period(
            start_utc=utc(result.window_start),
            end_utc=utc(result.window_end),
            settlement_point=SETTLEMENT_POINT,
        ),
        controls=_controls(),
        assumptions=schemas.Assumptions(
            fleet_mw=str(assumptions.fleet_mw),
            efficiency_j_per_th=str(assumptions.efficiency_j_per_th),
            pool_fee_rate=str(assumptions.pool_fee_rate),
            transmission_rate_usd_per_mw_year=str(
                assumptions.transmission_rate_usd_per_mw_year,
            ),
            peak_guard_threshold=str(assumptions.peak_guard_threshold),
        ),
        winner=schemas.Winner(
            id=result.winner,
            advantage_over_always_on_usd=usd(result.winner_advantage_usd),
        ),
        strategies=[_strategy(strategy) for strategy in result.strategies],
        fourcp_peaks=[_peak(peak) for peak in result.fourcp_peaks],
        series=[_point(point) for point in result.series],
        data_quality=schemas.DataQuality(
            expected_intervals=result.expected_intervals,
            missing_intervals=result.missing_intervals,
        ),
    )
