from datetime import UTC, datetime

from run_or_rest.config import INTERVAL, UTC_TIMESTAMP_FORMAT


def utc_text(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime(UTC_TIMESTAMP_FORMAT)


def interval_starts(first: datetime, end: datetime) -> list[datetime]:
    first_utc = first.astimezone(UTC)
    count = (end.astimezone(UTC) - first_utc) // INTERVAL
    return [first_utc + index * INTERVAL for index in range(count)]
