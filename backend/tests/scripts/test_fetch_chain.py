from datetime import UTC, date, datetime
from pathlib import Path

import pytest

from scripts.fetch_chain import (
    Block,
    DailyTotal,
    DifficultyRow,
    Rpc,
    daily_totals,
    difficulty_rows,
    first_height_at_or_after,
    last_height_before,
    lowest_height_where,
    retarget_height,
    write_daily,
    write_difficulty,
)

MAY_31 = int(datetime(2026, 5, 31, tzinfo=UTC).timestamp())
HOUR = 3600


def block(height: int, time: int, bits: str = "17023a04") -> Block:
    return Block(height, time, subsidy_sats=312_500_000, fees_sats=height, bits=bits)


def test_lowest_height_where_finds_the_first_true_height() -> None:
    flags = [False, False, True, True]

    assert lowest_height_where(lambda h: flags[h], 0, 3) == 2


def test_first_block_can_precede_the_median_time_crossing() -> None:
    times = [MAY_31 - 3 * HOUR, MAY_31 + HOUR, MAY_31 - HOUR, MAY_31 + 2 * HOUR]
    medians = [MAY_31 - 4 * HOUR, MAY_31 - 2 * HOUR, MAY_31 - HOUR, MAY_31]

    height = first_height_at_or_after(MAY_31, 3, times.__getitem__, medians.__getitem__)

    assert height == 1


def test_last_block_before_end_ignores_later_blocks_with_earlier_times() -> None:
    times = [MAY_31 - 2 * HOUR, MAY_31 - HOUR, MAY_31 + HOUR, MAY_31 - 1, MAY_31 + 9]
    medians = [MAY_31 - 3 * HOUR, MAY_31 - 2 * HOUR, MAY_31 - HOUR, MAY_31, MAY_31 + 1]

    height = last_height_before(MAY_31, 4, times.__getitem__, medians.__getitem__)

    assert height == 3


def test_chain_not_yet_past_the_end_exits() -> None:
    times = [MAY_31 - 2 * HOUR, MAY_31 - HOUR]
    medians = [MAY_31 - 3 * HOUR, MAY_31 - 2 * HOUR]

    with pytest.raises(SystemExit, match="does not yet reach"):
        last_height_before(MAY_31, 1, times.__getitem__, medians.__getitem__)


@pytest.mark.parametrize(("height", "expected"), [(4032, 4032), (6047, 4032)])
def test_retarget_height_is_the_multiple_of_2016_at_or_before(
    height: int,
    expected: int,
) -> None:
    assert retarget_height(height) == expected


def test_daily_totals_group_by_utc_date_within_range() -> None:
    june_1 = MAY_31 + 24 * HOUR
    blocks = [
        block(1, MAY_31 - 1),
        block(2, MAY_31),
        block(3, june_1 - 1),
        block(4, june_1),
    ]

    totals = daily_totals(blocks, date(2026, 5, 31), date(2026, 6, 1))

    assert totals == [
        DailyTotal(date(2026, 5, 31), 2, 625_000_000, 5),
        DailyTotal(date(2026, 6, 1), 1, 312_500_000, 4),
    ]


def test_a_day_without_blocks_exits() -> None:
    with pytest.raises(SystemExit, match=r"No blocks found on \['2026-06-01'\]"):
        daily_totals([block(1, MAY_31)], date(2026, 5, 31), date(2026, 6, 1))


def test_difficulty_rows_start_at_the_first_height_and_at_each_bits_change() -> None:
    blocks = [
        block(4032, MAY_31, "17023a04"),
        block(4033, MAY_31 + 600, "17023a04"),
        block(6048, MAY_31 + 1200, "17022b10"),
    ]

    assert difficulty_rows(blocks) == [
        DifficultyRow(datetime(2026, 5, 31, tzinfo=UTC), 4032, "17023a04"),
        DifficultyRow(datetime(2026, 5, 31, 0, 20, tzinfo=UTC), 6048, "17022b10"),
    ]


def test_csv_files_use_the_spec_schemas(tmp_path: Path) -> None:
    daily = tmp_path / "chain_daily.csv"
    epochs = tmp_path / "difficulty_epochs.csv"

    write_daily([DailyTotal(date(2026, 5, 31), 144, 45_000_000_000, 7)], daily)
    write_difficulty(
        [DifficultyRow(datetime(2026, 5, 26, 3, 4, 5, tzinfo=UTC), 4032, "17023a04")],
        epochs,
    )

    assert daily.read_text(encoding="utf-8") == (
        "date_utc,block_count,subsidy_sats,fees_sats\n2026-05-31,144,45000000000,7\n"
    )
    assert epochs.read_text(encoding="utf-8") == (
        "start_time_utc,height,bits\n2026-05-26T03:04:05Z,4032,17023a04\n"
    )


def test_rpc_url_must_be_http() -> None:
    with pytest.raises(SystemExit, match="must be an http"):
        Rpc("ftp://node:8332", "user", "secret")
