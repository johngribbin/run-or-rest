from bisect import bisect_right
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from run_or_rest.config import (
    BTC_PRICE_DAILY_PATH,
    CHAIN_DAILY_PATH,
    DIFFICULTY_EPOCHS_PATH,
    INTERVAL,
    LOAD_PATH,
    SPP_PATH,
)
from run_or_rest.core.models import (
    DailyChain,
    DayEconomics,
    HistoryInterval,
    WindowInterval,
)
from run_or_rest.core.timestamps import utc_text
from run_or_rest.data.files import (
    DataError,
    DifficultyEpoch,
    read_btc_price_daily,
    read_chain_daily,
    read_difficulty_epochs,
    read_interval_values,
)

ONE_DAY = timedelta(days=1)


@dataclass(frozen=True)
class DataPaths:
    spp: Path = SPP_PATH
    load: Path = LOAD_PATH
    chain_daily: Path = CHAIN_DAILY_PATH
    difficulty_epochs: Path = DIFFICULTY_EPOCHS_PATH
    btc_price_daily: Path = BTC_PRICE_DAILY_PATH


@dataclass(frozen=True)
class Ranges:
    history_start: datetime
    window_start: datetime
    window_end: datetime


@dataclass(frozen=True)
class LoadedData:
    history: tuple[HistoryInterval, ...]
    window: tuple[WindowInterval, ...]


@dataclass(frozen=True)
class _DailyData:
    paths: DataPaths
    chain: Mapping[date, DailyChain]
    btc_price: Mapping[date, Decimal]
    epochs: Sequence[DifficultyEpoch]


def _starts(first: datetime, end: datetime) -> list[datetime]:
    count = (end - first) // INTERVAL
    return [(first + index * INTERVAL).astimezone(UTC) for index in range(count)]


def _day(daily: _DailyData, day: date, start: datetime) -> DayEconomics:
    chain = daily.chain.get(day)
    price = daily.btc_price.get(day)
    if chain is None or price is None:
        path = daily.paths.chain_daily if chain is None else daily.paths.btc_price_daily
        msg = f"{path.name} has no row for {day}, needed by {utc_text(start)}"
        raise DataError(msg)
    return DayEconomics(chain=chain, btc_price_usd=price)


def _difficulty(daily: _DailyData, start: datetime) -> Decimal:
    index = bisect_right([epoch.start for epoch in daily.epochs], start)
    if index == 0:
        name = daily.paths.difficulty_epochs.name
        msg = f"{name} has no row at or before {utc_text(start)}"
        raise DataError(msg)
    return daily.epochs[index - 1].difficulty


@dataclass(frozen=True)
class _WindowSlot:
    start: datetime
    difficulty: Decimal
    day: DayEconomics
    previous_day: DayEconomics


def _window_slots(daily: _DailyData, ranges: Ranges) -> list[_WindowSlot]:
    return [
        _WindowSlot(
            start=start,
            difficulty=_difficulty(daily, start),
            day=_day(daily, start.date(), start),
            previous_day=_day(daily, start.date() - ONE_DAY, start),
        )
        for start in _starts(ranges.window_start, ranges.window_end)
    ]


def load_data(paths: DataPaths, ranges: Ranges) -> LoadedData:
    daily = _DailyData(
        paths=paths,
        chain=read_chain_daily(paths.chain_daily),
        btc_price=read_btc_price_daily(paths.btc_price_daily),
        epochs=read_difficulty_epochs(paths.difficulty_epochs),
    )
    slots = _window_slots(daily, ranges)
    prices = read_interval_values(paths.spp, "price_usd_per_mwh")
    loads = read_interval_values(paths.load, "load_mw")
    history = tuple(
        HistoryInterval(start, prices.get(start), loads.get(start))
        for start in _starts(ranges.history_start, ranges.window_start)
    )
    window = tuple(
        WindowInterval(
            start=slot.start,
            price_usd_per_mwh=prices.get(slot.start),
            load_mw=loads.get(slot.start),
            difficulty=slot.difficulty,
            day=slot.day,
            previous_day=slot.previous_day,
        )
        for slot in slots
    )
    return LoadedData(history=history, window=window)
