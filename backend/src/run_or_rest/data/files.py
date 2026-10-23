from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

import polars as pl

from run_or_rest.config import (
    BTC_PRICE_DAILY_COLUMNS,
    CHAIN_DAILY_COLUMNS,
    DIFFICULTY_EPOCH_COLUMNS,
    INTERVAL,
    INTERVAL_START_COLUMN,
)
from run_or_rest.core.economics import difficulty_from_bits
from run_or_rest.core.models import DailyChain, Sats
from run_or_rest.core.timestamps import utc_text
from run_or_rest.data import fields

START_COLUMN = INTERVAL_START_COLUMN
UNIX_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)
CSV_FIRST_ROW = 2
PARQUET_FIRST_ROW = 1


class DataError(ValueError):
    pass


class GridDataMissingError(FileNotFoundError):
    pass


@dataclass(frozen=True)
class DifficultyEpoch:
    start: datetime
    height: int
    difficulty: Decimal


Row = Mapping[str, object]


def _rows(path: Path, frame: pl.DataFrame, columns: Sequence[str]) -> list[Row]:
    if frame.columns != list(columns):
        msg = f"{path.name}: expected columns {list(columns)}, found {frame.columns}"
        raise DataError(msg)
    return list(frame.iter_rows(named=True))


def _parsed[T](
    path: Path,
    rows: Sequence[Row],
    parse: Callable[[Row], T],
    first_row: int = CSV_FIRST_ROW,
) -> list[T]:
    parsed: list[T] = []
    for index, row in enumerate(rows):
        try:
            parsed.append(parse(row))
        except (TypeError, ValueError) as error:
            msg = f"{path.name} row {first_row + index}: {error}"
            raise DataError(msg) from error
    return parsed


def _read_csv(path: Path, columns: Sequence[str]) -> list[Row]:
    if not path.is_file():
        msg = f"{path} not found"
        raise DataError(msg)
    return _rows(path, pl.read_csv(path, infer_schema=False), columns)


def _reject_duplicates(path: Path, keys: Sequence[object]) -> None:
    seen: set[object] = set()
    for key in keys:
        if key in seen:
            msg = f"{path.name}: duplicate row for {key}"
            raise DataError(msg)
        seen.add(key)


def _unique_by_key[K, V](path: Path, pairs: Sequence[tuple[K, V]]) -> dict[K, V]:
    _reject_duplicates(path, [key for key, _ in pairs])
    return dict(pairs)


def _chain_row(row: Row) -> tuple[date, DailyChain]:
    return fields.iso_date(row["date_utc"]), DailyChain(
        block_count=fields.positive_int(row["block_count"]),
        subsidy_sats=Sats(fields.non_negative_int(row["subsidy_sats"])),
        fees_sats=Sats(fields.non_negative_int(row["fees_sats"])),
    )


def read_chain_daily(path: Path) -> dict[date, DailyChain]:
    rows = _read_csv(path, CHAIN_DAILY_COLUMNS)
    return _unique_by_key(path, _parsed(path, rows, _chain_row))


def _price_row(row: Row) -> tuple[date, Decimal]:
    return fields.iso_date(row["date_utc"]), fields.positive_decimal(row["price_usd"])


def read_btc_price_daily(path: Path) -> dict[date, Decimal]:
    rows = _read_csv(path, BTC_PRICE_DAILY_COLUMNS)
    return _unique_by_key(path, _parsed(path, rows, _price_row))


def _epoch_row(row: Row) -> DifficultyEpoch:
    return DifficultyEpoch(
        start=fields.utc_timestamp(row["start_time_utc"]),
        height=fields.non_negative_int(row["height"]),
        difficulty=difficulty_from_bits(fields.bits(row["bits"])),
    )


def read_difficulty_epochs(path: Path) -> list[DifficultyEpoch]:
    rows = _read_csv(path, DIFFICULTY_EPOCH_COLUMNS)
    epochs = _parsed(path, rows, _epoch_row)
    _reject_duplicates(path, [epoch.start for epoch in epochs])
    return sorted(epochs, key=lambda epoch: epoch.start)


def _interval_start(value: object) -> datetime:
    if not isinstance(value, datetime) or value.utcoffset() is None:
        msg = f"{START_COLUMN} {value!r} is not a timezone-aware timestamp"
        raise ValueError(msg)
    if (value - UNIX_EPOCH) % INTERVAL:
        msg = f"{START_COLUMN} {utc_text(value)} is not on a 15-minute boundary"
        raise ValueError(msg)
    return value


def read_interval_values(path: Path, column: str) -> dict[datetime, Decimal | None]:
    if not path.is_file():
        msg = f"{path} not found"
        raise GridDataMissingError(msg)
    rows = _rows(path, pl.read_parquet(path), (START_COLUMN, column))

    def parse(row: Row) -> tuple[datetime, Decimal | None]:
        start = _interval_start(row[START_COLUMN])
        return start, fields.optional_two_place_decimal(row[column])

    return _unique_by_key(path, _parsed(path, rows, parse, PARQUET_FIRST_ROW))
