from run_or_rest.core.months import MonthKey, month_of, previous_month
from tests.core.builders import chicago


def test_previous_month_of_january_is_december_of_the_year_before() -> None:
    assert previous_month(MonthKey(2027, 1)) == MonthKey(2026, 12)


def test_previous_month_within_a_year() -> None:
    assert previous_month(MonthKey(2026, 7)) == MonthKey(2026, 6)


def test_month_is_the_chicago_calendar_month_not_the_utc_one() -> None:
    assert month_of(chicago(2026, 6, 30, 23, 45)) == MonthKey(2026, 6)
