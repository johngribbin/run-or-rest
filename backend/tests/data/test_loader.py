from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import polars as pl
import pytest

from run_or_rest.core.models import DailyChain, DayEconomics, Sats
from run_or_rest.data.files import DataError, GridDataMissingError
from run_or_rest.data.loader import LoadedData, load_data
from tests.data.support import RANGES, data_paths


def at(hour: int, minute: int) -> datetime:
    return datetime(2026, 6, 1, hour, minute, tzinfo=UTC)


def load(tmp_path: Path, edits: dict[str, tuple[str, str]] | None = None) -> LoadedData:
    return load_data(data_paths(tmp_path, edits), RANGES)


def test_history_intervals_carry_start_price_and_load(tmp_path: Path) -> None:
    history = load(tmp_path).history

    assert [(i.start, i.price_usd_per_mwh, i.load_mw) for i in history] == [
        (at(4, 30), Decimal("38.50"), Decimal("48000.00")),
        (at(4, 45), Decimal("40.00"), Decimal("49000.00")),
    ]


def test_window_intervals_keep_missing_values_as_none(tmp_path: Path) -> None:
    window = load(tmp_path).window

    assert [(i.start, i.price_usd_per_mwh, i.load_mw) for i in window] == [
        (at(5, 0), Decimal("41.25"), Decimal("50000.00")),
        (at(5, 15), None, Decimal("51000.50")),
        (at(5, 30), Decimal("-3.10"), None),
    ]


def test_interval_at_or_after_a_difficulty_change_uses_the_new_difficulty(
    tmp_path: Path,
) -> None:
    window = load(tmp_path).window

    assert [interval.difficulty for interval in window] == [
        Decimal(1),
        Decimal(256),
        Decimal(256),
    ]


def test_window_intervals_carry_the_utc_day_and_previous_day(tmp_path: Path) -> None:
    first = load(tmp_path).window[0]

    assert first.day == DayEconomics(
        chain=DailyChain(135, Sats(42_187_500_000), Sats(358_244_909)),
        btc_price_usd=Decimal("71328.7312172998"),
    )
    assert first.previous_day == DayEconomics(
        chain=DailyChain(144, Sats(45_000_000_000), Sats(271_843_942)),
        btc_price_usd=Decimal("73599.5607413209"),
    )


def test_missing_daily_chain_row_fails_loading(tmp_path: Path) -> None:
    edits = {"chain_daily.csv": ("2026-05-31,144,45000000000,271843942\n", "")}

    with pytest.raises(DataError, match=r"chain_daily\.csv has no row for 2026-05-31"):
        load(tmp_path, edits)


def test_missing_daily_price_row_fails_loading(tmp_path: Path) -> None:
    edits = {"btc_price_daily.csv": ("2026-06-01,71328.7312172998\n", "")}

    with pytest.raises(
        DataError, match=r"btc_price_daily\.csv has no row for 2026-06-01"
    ):
        load(tmp_path, edits)


def test_window_interval_before_any_difficulty_row_fails_loading(
    tmp_path: Path,
) -> None:
    edits = {"difficulty_epochs.csv": ("2026-05-29T10:29:46Z", "2026-06-01T05:10:00Z")}

    with pytest.raises(
        DataError,
        match=r"difficulty_epochs\.csv has no row at or before 2026-06-01T05:00:00",
    ):
        load(tmp_path, edits)


@pytest.mark.parametrize(
    ("file", "old", "new", "message"),
    [
        ("chain_daily.csv", ",144,", ",x,", "chain_daily.csv row 2: 'x' is not a non"),
        ("chain_daily.csv", ",144,", ",0,", "chain_daily.csv row 2: 0 is not positive"),
        ("chain_daily.csv", ",144,", ",,", "chain_daily.csv row 2: missing value"),
        ("chain_daily.csv", "2026-05-31", "31/05/2026", "row 2: '31/05/2026' is not"),
        ("chain_daily.csv", "2026-06-01", "2026-05-31", "duplicate row for 2026-05-31"),
        ("chain_daily.csv", "fees_sats", "fees", "expected columns"),
        ("btc_price_daily.csv", "73599.5607413209", "-1", "row 2: -1 is not positive"),
        ("btc_price_daily.csv", "73599.5607413209", "1e5", "row 2: '1e5' is not"),
        ("difficulty_epochs.csv", "1d00ffff", "zz00ffff", "row 2: 'zz00ffff' is not"),
        ("difficulty_epochs.csv", "1d00ffff", "1d000000", "row 2: '1d000000' has a"),
        ("difficulty_epochs.csv", "951552", "-1", "row 2: '-1' is not a non"),
        ("difficulty_epochs.csv", "T10:29:46Z", " 10:29:46", "row 2: '2026-05-29 10"),
        (
            "difficulty_epochs.csv",
            "2026-06-01T05:15:00Z",
            "2026-05-29T10:29:46Z",
            "duplicate",
        ),
        ("ercot_spp_lz_west.csv", "41.25", "41.2", "parquet row 3: '41.2' is not a"),
        ("ercot_spp_lz_west.csv", "T05:00:00Z", "T05:07:00Z", "not on a 15-minute"),
        ("ercot_load.csv", "T04:45:00Z", "T04:30:00Z", "ercot_load.parquet: duplicate"),
    ],
)
def test_malformed_row_fails_loading_naming_file_and_row(
    tmp_path: Path,
    file: str,
    old: str,
    new: str,
    message: str,
) -> None:
    with pytest.raises(DataError, match=message):
        load(tmp_path, {file: (old, new)})


@pytest.mark.parametrize("name", ["ercot_spp_lz_west.parquet", "ercot_load.parquet"])
def test_missing_grid_file_is_reported_separately(tmp_path: Path, name: str) -> None:
    paths = data_paths(tmp_path)
    (tmp_path / name).unlink()

    with pytest.raises(GridDataMissingError, match=name):
        load_data(paths, RANGES)


def test_missing_committed_csv_fails_even_without_grid_files(tmp_path: Path) -> None:
    paths = data_paths(tmp_path)
    for name in ("chain_daily.csv", "ercot_spp_lz_west.parquet", "ercot_load.parquet"):
        (tmp_path / name).unlink()

    with pytest.raises(DataError, match=r"chain_daily.csv not found"):
        load_data(paths, RANGES)


def test_grid_values_that_are_not_text_fail_loading(tmp_path: Path) -> None:
    paths = data_paths(tmp_path)
    pl.DataFrame(
        {"interval_start_utc": [at(5, 0)], "price_usd_per_mwh": [41.25]},
    ).write_parquet(paths.spp)

    with pytest.raises(DataError, match="parquet row 1: expected text, got float"):
        load_data(paths, RANGES)


def test_grid_start_without_a_timezone_fails_loading(tmp_path: Path) -> None:
    paths = data_paths(tmp_path)
    pl.DataFrame(
        {
            "interval_start_utc": [at(5, 0).replace(tzinfo=None)],
            "load_mw": ["50000.00"],
        },
    ).write_parquet(paths.load)

    with pytest.raises(
        DataError, match=r"parquet row 1: .* is not a timezone-aware timestamp"
    ):
        load_data(paths, RANGES)
