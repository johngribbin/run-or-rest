from datetime import UTC, datetime

from run_or_rest.config import UTC_TIMESTAMP_FORMAT


def utc_text(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime(UTC_TIMESTAMP_FORMAT)
