import os
import sys
from datetime import timedelta
from decimal import ROUND_HALF_EVEN, Decimal
from pathlib import Path

import polars as pl
from gridstatusio.gs_client import GridStatusClient

from run_or_rest.config import (
    GRIDSTATUS_API_KEY_ENV,
    HISTORY_START,
    INTERVAL,
    INTERVAL_START_COLUMN,
    LOAD_COLUMN,
    LOAD_DATASET,
    LOAD_PATH,
    PRICE_COLUMN,
    SETTLEMENT_POINT,
    SPP_DATASET,
    SPP_PATH,
    WINDOW_END,
)
from scripts.common import require_env

START_COLUMN = INTERVAL_START_COLUMN
KEY_HINT = "Export it or add it to .env and retry."
SPP_COLUMNS = (START_COLUMN, "location", "spp")
LOAD_COLUMNS = (START_COLUMN, "load")
CENTS = Decimal("0.01")


def require_columns(
    frame: pl.DataFrame, dataset: str, columns: tuple[str, ...]
) -> None:
    missing = [column for column in columns if column not in frame.columns]
    if missing:
        sys.exit(
            f"{dataset} is missing columns {missing}; it has {frame.columns}",
        )


def decimal_string(value: float) -> str:
    return str(Decimal(str(value)).quantize(CENTS, rounding=ROUND_HALF_EVEN))


def _decimal_strings(frame: pl.DataFrame, source: str, target: str) -> pl.DataFrame:
    return frame.select(
        pl.col(START_COLUMN).dt.convert_time_zone("UTC"),
        pl.col(source)
        .map_elements(decimal_string, return_dtype=pl.String)
        .alias(target),
    ).sort(START_COLUMN)


def prices(frame: pl.DataFrame) -> pl.DataFrame:
    require_columns(frame, SPP_DATASET, SPP_COLUMNS)
    others = frame.filter(pl.col("location") != SETTLEMENT_POINT)
    if others.height:
        sys.exit(f"{SPP_DATASET} returned locations other than {SETTLEMENT_POINT}")
    return _decimal_strings(frame, "spp", PRICE_COLUMN)


def loads(frame: pl.DataFrame) -> pl.DataFrame:
    require_columns(frame, LOAD_DATASET, LOAD_COLUMNS)
    starts = frame.get_column(START_COLUMN).unique().sort()
    step = starts.diff().drop_nulls().min()
    if not isinstance(step, timedelta) or step > INTERVAL:
        sys.exit(f"{LOAD_DATASET} is coarser than 15 minutes (step {step})")
    averaged = (
        frame.group_by(pl.col(START_COLUMN).dt.truncate("15m"))
        .agg(pl.col("load").mean())
        .sort(START_COLUMN)
    )
    return _decimal_strings(averaged, "load", LOAD_COLUMN)


def _write(frame: pl.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.write_parquet(path)
    print(f"Wrote {frame.height} rows to {path}")


def main() -> None:
    client = GridStatusClient(
        api_key=require_env(GRIDSTATUS_API_KEY_ENV, os.environ, KEY_HINT),
        return_format="polars",
    )
    spp = client.get_dataset(
        SPP_DATASET,
        start=HISTORY_START,
        end=WINDOW_END,
        filter_column="location",
        filter_value=SETTLEMENT_POINT,
    )
    load = client.get_dataset(LOAD_DATASET, start=HISTORY_START, end=WINDOW_END)
    _write(prices(spp), SPP_PATH)
    _write(loads(load), LOAD_PATH)


if __name__ == "__main__":
    main()
