from decimal import Decimal

import pytest

from run_or_rest.api.mapping import rounded, unrounded
from run_or_rest.config import RATIO_DECIMAL_PLACES


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


def test_unrounded_values_keep_their_digits_in_fixed_point() -> None:
    assert unrounded(Decimal("5E+4")) == "50000"
    assert unrounded(Decimal("0.950")) == "0.950"


def test_fees_share_example_is_sent_to_four_places() -> None:
    assert (
        rounded(Decimal("0.007936507936507936507936507937"), RATIO_DECIMAL_PLACES)
        == "0.0079"
    )


def test_difficulty_change_example_is_sent_to_four_places() -> None:
    assert rounded(Decimal("0.1"), RATIO_DECIMAL_PLACES) == "0.1000"
