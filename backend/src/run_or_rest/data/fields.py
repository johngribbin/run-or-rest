import re
from datetime import UTC, date, datetime
from decimal import Decimal

from run_or_rest.config import UTC_TIMESTAMP_FORMAT

TWO_PLACES = re.compile(r"-?\d+\.\d{2}")
PLAIN_DECIMAL = re.compile(r"-?\d+(\.\d+)?")
NON_NEGATIVE_INT = re.compile(r"\d+")
ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
UTC_TIMESTAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")
BITS = re.compile(r"[0-9a-fA-F]{8}")


def _text(value: object) -> str:
    if value is None:
        msg = "missing value"
        raise ValueError(msg)
    if not isinstance(value, str):
        msg = f"expected text, got {type(value).__name__}"
        raise TypeError(msg)
    return value


def _matching(value: object, pattern: re.Pattern[str], expected: str) -> str:
    text = _text(value)
    if pattern.fullmatch(text) is None:
        msg = f"{text!r} is not {expected}"
        raise ValueError(msg)
    return text


def two_place_decimal(value: object) -> Decimal:
    return Decimal(_matching(value, TWO_PLACES, "a decimal with 2 places"))


def optional_two_place_decimal(value: object) -> Decimal | None:
    return None if value is None else two_place_decimal(value)


def positive_decimal(value: object) -> Decimal:
    number = Decimal(_matching(value, PLAIN_DECIMAL, "a decimal"))
    if number <= 0:
        msg = f"{number} is not positive"
        raise ValueError(msg)
    return number


def non_negative_int(value: object) -> int:
    return int(_matching(value, NON_NEGATIVE_INT, "a non-negative integer"))


def positive_int(value: object) -> int:
    number = non_negative_int(value)
    if number == 0:
        msg = "0 is not positive"
        raise ValueError(msg)
    return number


def iso_date(value: object) -> date:
    return date.fromisoformat(_matching(value, ISO_DATE, "a YYYY-MM-DD date"))


def utc_timestamp(value: object) -> datetime:
    text = _matching(value, UTC_TIMESTAMP, "a YYYY-MM-DDTHH:MM:SSZ timestamp")
    return datetime.strptime(text, UTC_TIMESTAMP_FORMAT).replace(tzinfo=UTC)


def bits(value: object) -> str:
    text = _matching(value, BITS, "8 hexadecimal characters")
    if int(text, 16) & 0xFFFFFF == 0:
        msg = f"{text!r} has a zero mantissa"
        raise ValueError(msg)
    return text.lower()
