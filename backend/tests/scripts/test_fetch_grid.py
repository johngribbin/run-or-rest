from datetime import UTC, datetime

import polars as pl
import pytest

from scripts.fetch_grid import decimal_string, loads, prices


def at(hour: int, minute: int) -> datetime:
    return datetime(2026, 6, 1, hour, minute, tzinfo=UTC)


@pytest.mark.parametrize(
    ("value", "expected"),
    [(40.0, "40.00"), (2.675, "2.68"), (2.665, "2.66"), (-20.005, "-20.00")],
)
def test_decimal_string_rounds_half_even_to_two_places(
    value: float,
    expected: str,
) -> None:
    assert decimal_string(value) == expected


def test_prices_become_decimal_strings_with_missing_values_kept() -> None:
    frame = pl.DataFrame(
        {
            "interval_start_utc": [at(0, 15), at(0, 0)],
            "location": ["LZ_WEST", "LZ_WEST"],
            "spp": [None, 41.234],
        },
    )

    assert prices(frame).rows() == [(at(0, 0), "41.23"), (at(0, 15), None)]


def test_prices_from_another_location_are_rejected() -> None:
    frame = pl.DataFrame(
        {
            "interval_start_utc": [at(0, 0)],
            "location": ["HB_WEST"],
            "spp": [41.0],
        },
    )

    with pytest.raises(SystemExit, match="locations other than LZ_WEST"):
        prices(frame)


def test_missing_columns_are_named() -> None:
    frame = pl.DataFrame({"interval_start_utc": [at(0, 0)], "location": ["LZ_WEST"]})

    with pytest.raises(SystemExit, match=r"missing columns \['spp'\]"):
        prices(frame)


def test_five_minute_load_is_averaged_to_fifteen_minutes_by_start() -> None:
    frame = pl.DataFrame(
        {
            "interval_start_utc": [at(0, m) for m in (0, 5, 10, 15, 20, 25)],
            "load": [100.0, 200.0, 300.0, 400.0, 400.0, 401.0],
        },
    )

    assert loads(frame).rows() == [(at(0, 0), "200.00"), (at(0, 15), "400.33")]


def test_fifteen_minute_load_is_kept() -> None:
    frame = pl.DataFrame(
        {"interval_start_utc": [at(0, 0), at(0, 15)], "load": [50000.4, 50000.5]},
    )

    assert loads(frame).rows() == [(at(0, 0), "50000.40"), (at(0, 15), "50000.50")]


def test_load_coarser_than_fifteen_minutes_is_rejected() -> None:
    frame = pl.DataFrame(
        {"interval_start_utc": [at(0, 0), at(1, 0)], "load": [1.0, 2.0]},
    )

    with pytest.raises(SystemExit, match="coarser than 15 minutes"):
        loads(frame)
