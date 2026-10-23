from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from run_or_rest.core.timestamps import interval_starts, utc_text


def test_timestamps_are_written_in_utc_with_z() -> None:
    chicago_midnight = datetime(2026, 6, 1, tzinfo=ZoneInfo("America/Chicago"))

    assert utc_text(chicago_midnight) == "2026-06-01T05:00:00Z"
    assert utc_text(datetime(2026, 10, 1, 4, 45, tzinfo=UTC)) == "2026-10-01T04:45:00Z"


def test_interval_starts_cover_the_range_in_utc() -> None:
    chicago_midnight = datetime(2026, 6, 1, tzinfo=ZoneInfo("America/Chicago"))
    end = datetime(2026, 6, 1, 5, 45, tzinfo=UTC)

    assert interval_starts(chicago_midnight, end) == [
        datetime(2026, 6, 1, 5, 0, tzinfo=UTC),
        datetime(2026, 6, 1, 5, 15, tzinfo=UTC),
        datetime(2026, 6, 1, 5, 30, tzinfo=UTC),
    ]


def test_interval_starts_on_the_spring_forward_day_cover_23_hours() -> None:
    chicago = ZoneInfo("America/Chicago")

    starts = interval_starts(
        datetime(2026, 3, 8, tzinfo=chicago),
        datetime(2026, 3, 9, tzinfo=chicago),
    )

    assert len(starts) == 92
    assert len(set(starts)) == 92
    assert starts[0] == datetime(2026, 3, 8, 6, 0, tzinfo=UTC)
    assert starts[6:10] == [
        datetime(2026, 3, 8, 7, 30, tzinfo=UTC),
        datetime(2026, 3, 8, 7, 45, tzinfo=UTC),
        datetime(2026, 3, 8, 8, 0, tzinfo=UTC),
        datetime(2026, 3, 8, 8, 15, tzinfo=UTC),
    ]
    assert starts[-1] == datetime(2026, 3, 9, 4, 45, tzinfo=UTC)


def test_interval_starts_on_the_fall_back_day_keep_the_repeated_hour() -> None:
    chicago = ZoneInfo("America/Chicago")

    starts = interval_starts(
        datetime(2026, 11, 1, tzinfo=chicago),
        datetime(2026, 11, 2, tzinfo=chicago),
    )

    assert len(starts) == 100
    assert len(set(starts)) == 100
    assert starts[0] == datetime(2026, 11, 1, 5, 0, tzinfo=UTC)
    assert starts[4] == datetime(2026, 11, 1, 6, 0, tzinfo=UTC)
    assert starts[8] == datetime(2026, 11, 1, 7, 0, tzinfo=UTC)
    assert starts[-1] == datetime(2026, 11, 2, 5, 45, tzinfo=UTC)
