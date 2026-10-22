from dataclasses import dataclass
from datetime import datetime

from run_or_rest.config import MONTH_TIMEZONE


@dataclass(frozen=True)
class MonthKey:
    year: int
    month: int


def month_of(start: datetime) -> MonthKey:
    local = start.astimezone(MONTH_TIMEZONE)
    return MonthKey(local.year, local.month)


def previous_month(month: MonthKey) -> MonthKey:
    if month.month == 1:
        return MonthKey(month.year - 1, 12)
    return MonthKey(month.year, month.month - 1)
