from datetime import UTC, datetime

from run_or_rest.config import INTERVAL, UTC_TIMESTAMP_FORMAT


def utc_text(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime(UTC_TIMESTAMP_FORMAT)


def interval_starts(first: datetime, end: datetime) -> list[datetime]:
    count = (end - first) // INTERVAL
    return [(first + index * INTERVAL).astimezone(UTC) for index in range(count)]
