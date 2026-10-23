from datetime import UTC, datetime
from decimal import Decimal

from run_or_rest.core.models import StrategyId
from tests.core.builders import chicago, history, run, strategy, window

CHEAP = 40
BASE_LOAD = 50_000


def test_fall_back_day_settles_all_100_intervals_including_the_repeated_hour() -> None:
    result = run(
        history(chicago(2026, 10, 31, 23, 45), [CHEAP], [BASE_LOAD]),
        window(chicago(2026, 11, 1), [CHEAP] * 100, [BASE_LOAD] * 100),
    )
    starts = [point.start for point in result.series]
    always_on = strategy(result, StrategyId.ALWAYS_ON)

    assert result.expected_intervals == 100
    assert len(set(starts)) == 100
    assert datetime(2026, 11, 1, 6, 0, tzinfo=UTC) in starts
    assert datetime(2026, 11, 1, 7, 0, tzinfo=UTC) in starts
    assert starts[-1] == datetime(2026, 11, 2, 5, 45, tzinfo=UTC)
    assert always_on.revenue_usd == Decimal("2500.00")
    assert always_on.energy_cost_usd == Decimal("1000.00")


def test_spring_forward_day_settles_its_92_intervals_once_each() -> None:
    result = run(
        history(chicago(2026, 2, 28, 23, 45), [CHEAP], [BASE_LOAD]),
        window(chicago(2026, 3, 8), [CHEAP] * 92, [BASE_LOAD] * 92),
    )
    starts = [point.start for point in result.series]
    always_on = strategy(result, StrategyId.ALWAYS_ON)

    assert result.expected_intervals == 92
    assert len(set(starts)) == 92
    assert starts[-1] == datetime(2026, 3, 9, 4, 45, tzinfo=UTC)
    assert always_on.revenue_usd == Decimal("2300.00")
    assert always_on.energy_cost_usd == Decimal("920.00")
