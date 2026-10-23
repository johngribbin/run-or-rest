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
