from dataclasses import replace
from decimal import Decimal

from run_or_rest.config import INTERVAL
from run_or_rest.core.models import StrategyId
from tests.core.builders import ASSUMPTIONS, chicago, history, run, strategy, window

SEASON_START = chicago(2026, 6, 1)
SEASON_END = chicago(2026, 10, 1)
PEAK_DAY = 15
PEAK_HOUR = 16
BASE_LOAD = 50_000
NEAR_PEAK_LOAD = 59_000
PEAK_LOAD = 60_000
CHEAP = 40
SPIKE = 500


def peak_index(month: int) -> int:
    return (chicago(2026, month, PEAK_DAY, PEAK_HOUR) - SEASON_START) // INTERVAL


def season_with_peaks_in_every_month() -> tuple[list[int], list[int]]:
    count = (SEASON_END - SEASON_START) // INTERVAL
    prices = [CHEAP] * count
    loads = [BASE_LOAD] * count
    for month in (6, 7, 8, 9):
        peak = peak_index(month)
        loads[peak] = PEAK_LOAD
        loads[peak - 1] = NEAR_PEAK_LOAD
        if month != 6:
            prices[peak - 1] = SPIKE
    return prices, loads


def test_peaks_run_in_set_transmission_at_zero_one_and_four_of_four() -> None:
    prices, loads = season_with_peaks_in_every_month()
    assumptions = replace(
        ASSUMPTIONS,
        transmission_rate_usd_per_mw_year=Decimal(50_000),
    )

    result = run(
        history(chicago(2026, 5, 31, 23, 45), [CHEAP], [BASE_LOAD]),
        window(SEASON_START, prices, loads),
        assumptions,
    )

    assert [outcome.peak.start for outcome in result.fourcp_peaks] == [
        chicago(2026, month, PEAK_DAY, PEAK_HOUR) for month in (6, 7, 8, 9)
    ]
    assert result.charge_per_peak_usd == Decimal(12_500)
    assert [
        (item.peaks_running, item.transmission_usd)
        for item in (
            strategy(result, StrategyId.ALWAYS_ON),
            strategy(result, StrategyId.STRIKE_PRICE),
            strategy(result, StrategyId.STRIKE_PEAK_GUARD),
        )
    ] == [
        (4, Decimal(50_000)),
        (1, Decimal(12_500)),
        (0, Decimal(0)),
    ]
