from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal

from run_or_rest.core.economics import (
    fees_share,
    hashprice_usd_per_ph_day,
    reward_per_block_sats,
)
from run_or_rest.core.models import WindowInterval


@dataclass(frozen=True)
class BitcoinDay:
    date_utc: date
    btc_price_usd: Decimal
    difficulty: Decimal
    reward_per_block_sats: Decimal
    fees_share: Decimal
    hashprice_usd_per_ph_day: Decimal


@dataclass(frozen=True)
class DifficultyAdjustment:
    start: datetime
    difficulty: Decimal
    change_ratio: Decimal | None


def bitcoin_days(
    window: Sequence[WindowInterval],
    pool_fee_rate: Decimal,
) -> list[BitcoinDay]:
    first_by_day: dict[date, WindowInterval] = {}
    for interval in window:
        first_by_day.setdefault(interval.start.astimezone(UTC).date(), interval)
    return [
        BitcoinDay(
            date_utc=day,
            btc_price_usd=first.day.btc_price_usd,
            difficulty=first.difficulty,
            reward_per_block_sats=reward_per_block_sats(first.day.chain),
            fees_share=fees_share(first.day.chain),
            hashprice_usd_per_ph_day=hashprice_usd_per_ph_day(
                pool_fee_rate,
                first.difficulty,
                first.day,
            ),
        )
        for day, first in first_by_day.items()
    ]


def difficulty_adjustments(
    window: Sequence[WindowInterval],
) -> list[DifficultyAdjustment]:
    adjustments: list[DifficultyAdjustment] = []
    previous: Decimal | None = None
    for interval in window:
        if previous is None:
            adjustments.append(
                DifficultyAdjustment(interval.start, interval.difficulty, None),
            )
        elif interval.difficulty != previous:
            adjustments.append(
                DifficultyAdjustment(
                    interval.start,
                    interval.difficulty,
                    interval.difficulty / previous - 1,
                ),
            )
        previous = interval.difficulty
    return adjustments
