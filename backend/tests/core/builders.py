from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal

from run_or_rest.config import INTERVAL, MONTH_TIMEZONE
from run_or_rest.core.backtest import BacktestResult, StrategyResult, run_backtest
from run_or_rest.core.models import (
    Assumptions,
    DailyChain,
    DayEconomics,
    HistoryInterval,
    Sats,
    StrategyId,
    WindowInterval,
)

ONE_BLOCK_DIFFICULTY = Decimal("8381903171.539306640625")
CHAIN = DailyChain(block_count=1, subsidy_sats=Sats(25_000), fees_sats=Sats(0))
DAY = DayEconomics(chain=CHAIN, btc_price_usd=Decimal(100_000))
ASSUMPTIONS = Assumptions(
    fleet_mw=Decimal(1),
    efficiency_j_per_th=Decimal(25),
    pool_fee_rate=Decimal(0),
    transmission_rate_usd_per_mw_year=Decimal(0),
    peak_guard_threshold=Decimal("0.95"),
)


def chicago(
    year: int, month: int, day: int, hour: int = 0, minute: int = 0
) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=MONTH_TIMEZONE)


def _decimal(value: int | None) -> Decimal | None:
    return None if value is None else Decimal(value)


def history(
    start: datetime,
    prices: Sequence[int | None],
    loads: Sequence[int | None],
) -> list[HistoryInterval]:
    first = start.astimezone(UTC)
    return [
        HistoryInterval(first + index * INTERVAL, _decimal(price), _decimal(load))
        for index, (price, load) in enumerate(zip(prices, loads, strict=True))
    ]


def window(
    start: datetime,
    prices: Sequence[int | None],
    loads: Sequence[int | None],
    day: DayEconomics = DAY,
    previous_day: DayEconomics = DAY,
) -> list[WindowInterval]:
    first = start.astimezone(UTC)
    return [
        WindowInterval(
            start=first + index * INTERVAL,
            price_usd_per_mwh=_decimal(price),
            load_mw=_decimal(load),
            difficulty=ONE_BLOCK_DIFFICULTY,
            day=day,
            previous_day=previous_day,
        )
        for index, (price, load) in enumerate(zip(prices, loads, strict=True))
    ]


def run(
    past: Sequence[HistoryInterval],
    intervals: Sequence[WindowInterval],
    assumptions: Assumptions = ASSUMPTIONS,
) -> BacktestResult:
    return run_backtest(
        past,
        intervals,
        intervals[0].start,
        intervals[-1].start + INTERVAL,
        assumptions,
    )


def strategy(result: BacktestResult, strategy_id: StrategyId) -> StrategyResult:
    return next(item for item in result.strategies if item.id is strategy_id)
