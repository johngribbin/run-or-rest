from datetime import UTC, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from run_or_rest.api.mapping import rounded, utc


@pytest.mark.parametrize(
    ("value", "places", "expected"),
    [
        ("2400.005", 2, "2400.00"),
        ("2400.015", 2, "2400.02"),
        ("-1.005", 2, "-1.00"),
        ("82712.65", 1, "82712.6"),
        ("82712.75", 1, "82712.8"),
        ("0.95", 2, "0.95"),
        ("50000", 2, "50000.00"),
    ],
)
def test_values_round_half_even_to_their_places(
    value: str,
    places: int,
    expected: str,
) -> None:
    assert rounded(Decimal(value), places) == expected


def test_a_value_rounding_to_zero_has_no_minus_sign() -> None:
    assert rounded(Decimal("-0.004"), 2) == "0.00"


def test_timestamps_are_written_in_utc_with_z() -> None:
    chicago_midnight = datetime(2026, 6, 1, tzinfo=ZoneInfo("America/Chicago"))

    assert utc(chicago_midnight) == "2026-06-01T05:00:00Z"
    assert utc(datetime(2026, 10, 1, 4, 45, tzinfo=UTC)) == "2026-10-01T04:45:00Z"
