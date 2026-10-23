from datetime import datetime
from decimal import Decimal

import pytest

from run_or_rest.config import INTERVAL
from run_or_rest.core.backtest import run_backtest
from run_or_rest.core.models import (
    BacktestError,
    DailyChain,
    DayEconomics,
    Decision,
    Sats,
    StrategyId,
)
from tests.core.builders import (
    ASSUMPTIONS,
    CHAIN,
    chicago,
    history,
    run,
    strategy,
    window,
)

JUNE_1 = chicago(2026, 6, 1)
JULY_1 = chicago(2026, 7, 1)
MAY_31_LAST = chicago(2026, 5, 31, 23, 45)


def guard_decisions(
    past_loads: list[int | None],
    loads: list[int | None],
    start: datetime = JULY_1,
) -> list[Decision]:
    past_start = start - len(past_loads) * INTERVAL
    result = run(
        history(past_start, [40] * len(past_loads), past_loads),
        window(start, [40] * len(loads), loads),
    )
    return [point.decisions[StrategyId.STRIKE_PEAK_GUARD] for point in result.series]


@pytest.mark.parametrize(
    ("previous_load", "expected"),
    [(76_000, Decision.OFF), (75_000, Decision.RUN)],
)
def test_first_interval_of_month_guards_against_previous_month_peak(
    previous_load: int,
    expected: Decision,
) -> None:
    decisions = guard_decisions([80_000, previous_load], [50_000])

    assert decisions == [expected]


def test_month_to_date_peak_raises_the_reference_after_the_first_interval() -> None:
    decisions = guard_decisions([80_000, 50_000], [90_000, 85_000, 50_000])

    assert decisions == [Decision.RUN, Decision.OFF, Decision.RUN]


def test_load_of_interval_skipped_for_missing_price_is_still_previous_load() -> None:
    result = run(
        history(MAY_31_LAST, [40], [90_000]),
        window(JUNE_1, [40, None, 40], [99_000, 50_000, 50_000]),
    )

    assert [
        point.decisions[StrategyId.STRIKE_PEAK_GUARD] for point in result.series
    ] == [
        Decision.OFF,
        Decision.RUN,
    ]


def test_settlement_uses_the_day_and_breakeven_uses_the_previous_day() -> None:
    day = DayEconomics(chain=CHAIN, btc_price_usd=Decimal(200_000))
    previous_day = DayEconomics(chain=CHAIN, btc_price_usd=Decimal(100_000))

    result = run(
        history(MAY_31_LAST, [40], [100_000]),
        window(JUNE_1, [40], [50_000], day=day, previous_day=previous_day),
    )

    assert strategy(result, StrategyId.ALWAYS_ON).revenue_usd == Decimal(50)
    assert result.series[0].breakeven_estimate_usd_per_mwh == Decimal(100)


def test_breakeven_uses_the_previous_day_reward_per_block() -> None:
    chain = DailyChain(block_count=2, subsidy_sats=Sats(25_000), fees_sats=Sats(0))
    previous_day = DayEconomics(chain=chain, btc_price_usd=Decimal(100_000))

    result = run(
        history(MAY_31_LAST, [40], [100_000]),
        window(JUNE_1, [40], [50_000], previous_day=previous_day),
    )

    assert result.series[0].breakeven_estimate_usd_per_mwh == Decimal(50)
    assert strategy(result, StrategyId.ALWAYS_ON).revenue_usd == Decimal(25)


def test_missing_fourcp_peak_price_fails_the_backtest() -> None:
    with pytest.raises(BacktestError, match=r"4CP peak interval .* has no price"):
        run(
            history(MAY_31_LAST, [40], [100_000]),
            window(JUNE_1, [40, None], [50_000, 60_000]),
        )


def test_month_without_any_load_fails_the_backtest() -> None:
    with pytest.raises(BacktestError, match="No system load in month 2026-06"):
        run(
            history(MAY_31_LAST, [40], [100_000]),
            window(JUNE_1, [40], [None]),
        )


def test_no_earlier_price_fails_the_backtest() -> None:
    with pytest.raises(BacktestError, match="No price before"):
        run(history(MAY_31_LAST, [None], [100_000]), window(JUNE_1, [40], [50_000]))


def test_no_earlier_load_fails_the_backtest() -> None:
    with pytest.raises(BacktestError, match="No load before"):
        run(history(MAY_31_LAST, [40], [None]), window(JUNE_1, [40], [50_000]))


def test_no_load_in_previous_month_fails_the_backtest() -> None:
    april_30_last = chicago(2026, 4, 30, 23, 45)

    with pytest.raises(BacktestError, match="No load in the previous month"):
        run(history(april_30_last, [40], [100_000]), window(JUNE_1, [40], [50_000]))


def test_window_with_a_gap_fails_the_backtest() -> None:
    intervals = window(JUNE_1, [40, 40], [50_000, 50_000])

    with pytest.raises(BacktestError, match="cover every interval"):
        run_backtest(
            history(MAY_31_LAST, [40], [100_000]),
            intervals,
            JUNE_1,
            JUNE_1 + 3 * INTERVAL,
            ASSUMPTIONS,
        )


def test_history_reaching_into_the_window_fails_the_backtest() -> None:
    with pytest.raises(BacktestError, match="before the window"):
        run(history(JUNE_1, [40], [100_000]), window(JUNE_1, [40], [50_000]))
