from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from run_or_rest.core.timestamps import utc_text


def test_timestamps_are_written_in_utc_with_z() -> None:
    chicago_midnight = datetime(2026, 6, 1, tzinfo=ZoneInfo("America/Chicago"))

    assert utc_text(chicago_midnight) == "2026-06-01T05:00:00Z"
    assert utc_text(datetime(2026, 10, 1, 4, 45, tzinfo=UTC)) == "2026-10-01T04:45:00Z"
