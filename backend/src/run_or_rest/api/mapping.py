from collections.abc import Mapping
from decimal import ROUND_HALF_EVEN, Decimal

from run_or_rest.api import schemas
from run_or_rest.config import (
    DIFFICULTY_DECIMAL_PLACES,
    HOURS_DECIMAL_PLACES,
    LOAD_DECIMAL_PLACES,
    PEAK_GUARD_THRESHOLD_DEFAULT,
    PEAK_GUARD_THRESHOLD_MAX,
    PEAK_GUARD_THRESHOLD_MIN,
    PEAK_GUARD_THRESHOLD_STEP,
    PRICE_DECIMAL_PLACES,
    RATIO_DECIMAL_PLACES,
    REWARD_DECIMAL_PLACES,
    SETTLEMENT_POINT,
    THRESHOLD_DECIMAL_PLACES,
    USD_DECIMAL_PLACES,
)
from run_or_rest.core.backtest import (
    BacktestResult,
    PeakOutcome,
    SeriesPoint,
    StrategyResult,
)
from run_or_rest.core.bitcoin import BitcoinDay, DifficultyAdjustment
from run_or_rest.core.models import Decision, StrategyId
from run_or_rest.core.timestamps import utc_text


def rounded(value: Decimal, places: int) -> str:
    quantized = value.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_EVEN)
    return str(quantized.copy_abs() if quantized.is_zero() else quantized)


def unrounded(value: Decimal) -> str:
    return f"{value:f}"


def usd(value: Decimal) -> str:
    return rounded(value, USD_DECIMAL_PLACES)


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
        peaks_running=result.peaks_running,
        gain_vs_always_on=schemas.Gain(
            price_usd=usd(gain.price_usd),
            fourcp_usd=usd(gain.fourcp_usd),
            total_usd=usd(gain.total_usd),
        ),
    )


def _decisions(decisions: Mapping[StrategyId, Decision]) -> schemas.Decisions:
    return schemas.Decisions(
        **{strategy.value: decision for strategy, decision in decisions.items()},
    )


def _peak(outcome: PeakOutcome) -> schemas.FourCpPeak:
    peak = outcome.peak
    return schemas.FourCpPeak(
        month=f"{peak.month.year:04d}-{peak.month.month:02d}",
        interval_start_utc=utc_text(peak.start),
        system_load_mw=rounded(peak.load_mw, LOAD_DECIMAL_PLACES),
        price_usd_per_mwh=rounded(peak.price_usd_per_mwh, PRICE_DECIMAL_PLACES),
        decisions=_decisions(outcome.decisions),
    )


def _point(point: SeriesPoint) -> schemas.SeriesPoint:
    return schemas.SeriesPoint(
        interval_start_utc=utc_text(point.start),
        price_usd_per_mwh=rounded(point.price_usd_per_mwh, PRICE_DECIMAL_PLACES),
        breakeven_estimate_usd_per_mwh=rounded(
            point.breakeven_estimate_usd_per_mwh,
            PRICE_DECIMAL_PLACES,
        ),
        decisions=_decisions(point.decisions),
    )


def _bitcoin_day(day: BitcoinDay) -> schemas.BitcoinDay:
    return schemas.BitcoinDay(
        date_utc=day.date_utc.isoformat(),
        btc_price_usd=usd(day.btc_price_usd),
        difficulty=rounded(day.difficulty, DIFFICULTY_DECIMAL_PLACES),
        reward_per_block_sats=rounded(
            day.reward_per_block_sats,
            REWARD_DECIMAL_PLACES,
        ),
        fees_share=rounded(day.fees_share, RATIO_DECIMAL_PLACES),
        hashprice_usd_per_ph_day=usd(day.hashprice_usd_per_ph_day),
    )


def _adjustment(adjustment: DifficultyAdjustment) -> schemas.DifficultyAdjustment:
    ratio = adjustment.change_ratio
    return schemas.DifficultyAdjustment(
        start_utc=utc_text(adjustment.start),
        difficulty=rounded(adjustment.difficulty, DIFFICULTY_DECIMAL_PLACES),
        change_ratio=None if ratio is None else rounded(ratio, RATIO_DECIMAL_PLACES),
    )


def to_response(result: BacktestResult) -> schemas.BacktestResponse:
    assumptions = result.assumptions
    return schemas.BacktestResponse(
        period=schemas.Period(
            start_utc=utc_text(result.window_start),
            end_utc=utc_text(result.window_end),
            settlement_point=SETTLEMENT_POINT,
        ),
        controls=_controls(),
        assumptions=schemas.Assumptions(
            fleet_mw=unrounded(assumptions.fleet_mw),
            efficiency_j_per_th=unrounded(assumptions.efficiency_j_per_th),
            pool_fee_rate=unrounded(assumptions.pool_fee_rate),
            transmission_rate_usd_per_mw_year=unrounded(
                assumptions.transmission_rate_usd_per_mw_year,
            ),
            peak_guard_threshold=unrounded(assumptions.peak_guard_threshold),
        ),
        winner=schemas.Winner(
            id=result.winner,
            advantage_over_always_on_usd=usd(result.winner_advantage_usd),
        ),
        strategies=[_strategy(strategy) for strategy in result.strategies],
        fourcp=schemas.FourCp(
            charge_per_peak_usd=usd(result.charge_per_peak_usd),
            peaks=[_peak(outcome) for outcome in result.fourcp_peaks],
        ),
        bitcoin=schemas.Bitcoin(
            daily=[_bitcoin_day(day) for day in result.bitcoin_days],
            difficulty_adjustments=[
                _adjustment(adjustment) for adjustment in result.difficulty_adjustments
            ],
        ),
        series=[_point(point) for point in result.series],
        data_quality=schemas.DataQuality(
            expected_intervals=result.expected_intervals,
            missing_intervals=result.missing_intervals,
        ),
    )
