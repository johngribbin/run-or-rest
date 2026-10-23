import sys
from collections.abc import Mapping
from datetime import date, timedelta


def require_env(name: str, environ: Mapping[str, str], hint: str) -> str:
    value = environ.get(name, "")
    if not value:
        sys.exit(f"{name} is not set. {hint}")
    return value


def inclusive_days(first: date, last: date) -> list[date]:
    return [first + timedelta(days=offset) for offset in range((last - first).days + 1)]
