from dataclasses import replace
from decimal import Decimal

from run_or_rest.core.bitcoin import bitcoin_days, difficulty_adjustments
from run_or_rest.core.models import DailyChain, DayEconomics, Sats, WindowInterval
from tests.core.builders import chicago, window

LATE_MAY_31 = chicago(2026, 5, 31, 18, 45)
JUNE_DAY = DayEconomics(
    chain=DailyChain(
        block_count=1,
        subsidy_sats=Sats(320_000_000),
        fees_sats=Sats(0),
    ),
    btc_price_usd=Decimal(80_000),
)


def with_difficulties(difficulties: list[int]) -> list[WindowInterval]:
    intervals = window(LATE_MAY_31, [40] * len(difficulties), [1] * len(difficulties))
    return [
        replace(interval, difficulty=Decimal(difficulty))
        for interval, difficulty in zip(intervals, difficulties, strict=True)
    ]


def test_first_adjustment_has_no_ratio_and_changes_have_one() -> None:
    adjustments = difficulty_adjustments(with_difficulties([100, 100, 110, 110]))

    assert [
        (item.start, item.difficulty, item.change_ratio) for item in adjustments
    ] == [
        (chicago(2026, 5, 31, 18, 45), Decimal(100), None),
        (chicago(2026, 5, 31, 19, 15), Decimal(110), Decimal("0.1")),
    ]


def test_bitcoin_day_uses_its_values_and_first_interval_difficulty() -> None:
    intervals = with_difficulties([100, 20_599_365_234_375, 20_599_365_234_375, 7])
    june = [replace(interval, day=JUNE_DAY) for interval in intervals[1:]]

    days = bitcoin_days([intervals[0], *june], Decimal("0.02"))

    assert [day.date_utc.isoformat() for day in days] == ["2026-05-31", "2026-06-01"]
    june_row = days[1]
    assert june_row.difficulty == Decimal(20_599_365_234_375)
    assert june_row.btc_price_usd == Decimal(80_000)
    assert june_row.reward_per_block_sats == Decimal(320_000_000)
    assert june_row.fees_share == Decimal(0)
    assert june_row.hashprice_usd_per_ph_day == Decimal("245.00")
