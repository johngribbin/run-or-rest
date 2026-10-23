from collections.abc import Sequence
from dataclasses import replace
from decimal import Decimal

from run_or_rest.core.backtest import BacktestResult
from run_or_rest.core.models import Decision, HistoryInterval, StrategyId
from tests.core.builders import (
    ASSUMPTIONS,
    chicago,
    history,
    run,
    strategy,
    window,
)

JUNE_1 = chicago(2026, 6, 1)
MAY_31_LAST = chicago(2026, 5, 31, 23, 45)
MAY_31_LAST_TWO = chicago(2026, 5, 31, 23, 30)


def quiet_history() -> list[HistoryInterval]:
    return history(MAY_31_LAST_TWO, [40, 40], [100_000, 50_000])


def worked_day_prices() -> list[int]:
    return [40] * 40 + [500] * 16 + [40] * 40


def off_indices(result: BacktestResult, strategy_id: StrategyId) -> list[int]:
    return [
        index
        for index, point in enumerate(result.series)
        if point.decisions[strategy_id] is Decision.OFF
    ]


def worked_day(loads: Sequence[int], transmission_rate: int = 0) -> BacktestResult:
    assumptions = replace(
        ASSUMPTIONS,
        transmission_rate_usd_per_mw_year=Decimal(transmission_rate),
    )
    return run(
        quiet_history(),
        window(JUNE_1, worked_day_prices(), loads),
        assumptions,
    )


def test_worked_day_always_on() -> None:
    always_on = strategy(worked_day([50_000] * 96), StrategyId.ALWAYS_ON)

    assert always_on.revenue_usd == Decimal("2400.00")
    assert always_on.energy_cost_usd == Decimal("2800.00")
    assert always_on.net_profit_usd == Decimal("-400.00")
    assert always_on.hours_off == Decimal("0.00")
    assert always_on.mined_sats == 2_400_000


def test_worked_day_strike_price_reacts_one_interval_late() -> None:
    result = worked_day([50_000] * 96)
    strike = strategy(result, StrategyId.STRIKE_PRICE)

    assert strike.revenue_usd == Decimal("2000.00")
    assert strike.energy_cost_usd == Decimal("915.00")
    assert strike.net_profit_usd == Decimal("1085.00")
    assert strike.hours_off == Decimal("4.00")
    assert off_indices(result, StrategyId.STRIKE_PRICE) == list(range(41, 57))


def test_worked_day_series_and_data_quality() -> None:
    result = worked_day([50_000] * 96)

    assert len(result.series) == 96
    assert result.series[40].price_usd_per_mwh == Decimal(500)
    assert result.series[40].breakeven_estimate_usd_per_mwh == Decimal("100.00")
    assert result.expected_intervals == 96
    assert result.missing_intervals == 0


def test_gain_split_adds_up_exactly_with_a_peak_avoided() -> None:
    loads = [50_000] * 96
    loads[50] = 60_000

    result = worked_day(loads, transmission_rate=50_000)
    always_on = strategy(result, StrategyId.ALWAYS_ON)
    strike = strategy(result, StrategyId.STRIKE_PRICE)

    assert [
        (outcome.peak.start, outcome.peak.load_mw) for outcome in result.fourcp_peaks
    ] == [
        (chicago(2026, 6, 1, 12, 30), Decimal(60_000)),
    ]
    assert always_on.transmission_usd == Decimal(50_000)
    assert always_on.net_profit_usd == Decimal(-50_400)
    assert strike.transmission_usd == Decimal(0)
    assert strike.gain_vs_always_on.price_usd == Decimal(1485)
    assert strike.gain_vs_always_on.fourcp_usd == Decimal(50_000)
    assert strike.gain_vs_always_on.total_usd == Decimal(51_485)
    assert (
        strike.gain_vs_always_on.price_usd + strike.gain_vs_always_on.fourcp_usd
        == strike.gain_vs_always_on.total_usd
    )
    assert always_on.gain_vs_always_on.total_usd == Decimal(0)


def test_peak_outcome_reports_price_decisions_and_peaks_run_in() -> None:
    loads = [50_000] * 96
    loads[50] = 60_000

    result = worked_day(loads, transmission_rate=50_000)
    outcome = result.fourcp_peaks[0]

    assert outcome.peak.price_usd_per_mwh == Decimal(500)
    assert outcome.decisions == {
        StrategyId.ALWAYS_ON: Decision.RUN,
        StrategyId.STRIKE_PRICE: Decision.OFF,
        StrategyId.STRIKE_PEAK_GUARD: Decision.OFF,
    }
    assert strategy(result, StrategyId.ALWAYS_ON).peaks_running == 1
    assert strategy(result, StrategyId.STRIKE_PRICE).peaks_running == 0
    assert result.charge_per_peak_usd == Decimal(50_000)


def test_fourcp_peak_tie_goes_to_the_earliest_interval() -> None:
    loads = [50_000] * 96
    loads[10] = 60_000
    loads[70] = 60_000

    result = worked_day(loads)

    assert [outcome.peak.start for outcome in result.fourcp_peaks] == [
        chicago(2026, 6, 1, 2, 30),
    ]


def test_winner_is_highest_net_and_earlier_strategy_wins_a_tie() -> None:
    loads = [50_000] * 96
    loads[50] = 60_000

    result = worked_day(loads, transmission_rate=50_000)

    assert strategy(result, StrategyId.STRIKE_PEAK_GUARD).net_profit_usd == Decimal(
        1085,
    )
    assert result.winner is StrategyId.STRIKE_PRICE
    assert result.winner_advantage_usd == Decimal(51_485)


def test_exact_three_way_tie_goes_to_always_on() -> None:
    result = run(
        quiet_history(),
        window(JUNE_1, [40, 40], [50_000, 50_000]),
    )

    assert [item.net_profit_usd for item in result.strategies] == [
        Decimal(30),
        Decimal(30),
        Decimal(30),
    ]
    assert result.winner is StrategyId.ALWAYS_ON
    assert result.winner_advantage_usd == Decimal(0)


def test_strategies_are_reported_in_spec_order_with_labels() -> None:
    result = worked_day([50_000] * 96)

    assert [(item.id, item.label) for item in result.strategies] == [
        (StrategyId.ALWAYS_ON, "Always on"),
        (StrategyId.STRIKE_PRICE, "Strike price"),
        (StrategyId.STRIKE_PEAK_GUARD, "Strike + peak guard"),
    ]


def test_invariants_always_on_mines_most_and_costs_most_at_positive_prices() -> None:
    result = worked_day([50_000] * 96)
    always_on = strategy(result, StrategyId.ALWAYS_ON)

    others = [item for item in result.strategies if item.id is not StrategyId.ALWAYS_ON]
    assert [item.id for item in others] == [
        StrategyId.STRIKE_PRICE,
        StrategyId.STRIKE_PEAK_GUARD,
    ]
    for item in others:
        assert item.mined_sats <= always_on.mined_sats
        assert item.energy_cost_usd <= always_on.energy_cost_usd


def test_skipped_interval_adds_nothing_and_is_counted_missing() -> None:
    result = run(
        history(MAY_31_LAST, [40], [100_000]),
        window(JUNE_1, [500, None, 40], [50_000, 50_000, 50_000]),
    )
    always_on = strategy(result, StrategyId.ALWAYS_ON)
    strike = strategy(result, StrategyId.STRIKE_PRICE)

    assert [point.start for point in result.series] == [
        chicago(2026, 6, 1, 0, 0),
        chicago(2026, 6, 1, 0, 30),
    ]
    assert always_on.revenue_usd == Decimal(50)
    assert always_on.energy_cost_usd == Decimal(135)
    assert strike.revenue_usd == Decimal(25)
    assert strike.energy_cost_usd == Decimal(125)
    assert strike.hours_off == Decimal("0.25")
    assert result.expected_intervals == 3
    assert result.missing_intervals == 1


def test_interval_missing_its_load_is_skipped() -> None:
    result = run(
        history(MAY_31_LAST, [40], [100_000]),
        window(JUNE_1, [40, 40, 40], [50_000, None, 50_000]),
    )

    assert len(result.series) == 2
    assert result.missing_intervals == 1
    assert strategy(result, StrategyId.ALWAYS_ON).revenue_usd == Decimal(50)
