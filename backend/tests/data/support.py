from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

import polars as pl

from run_or_rest.data.loader import DataPaths, Ranges

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "data"
CSV_FILES = ("chain_daily.csv", "btc_price_daily.csv", "difficulty_epochs.csv")
GRID_FILES = {
    "ercot_spp_lz_west": "price_usd_per_mwh",
    "ercot_load": "load_mw",
}
RANGES = Ranges(
    history_start=datetime(2026, 6, 1, 4, 30, tzinfo=UTC),
    window_start=datetime(2026, 6, 1, 5, 0, tzinfo=UTC),
    window_end=datetime(2026, 6, 1, 5, 45, tzinfo=UTC),
)

Edits = Mapping[str, tuple[str, str]]


def _fixture_text(name: str, edits: Edits) -> str:
    text = (FIXTURES / name).read_text(encoding="utf-8")
    if name in edits:
        old, new = edits[name]
        assert text.count(old) == 1
        text = text.replace(old, new)
    return text


def grid_frame(text: str, column: str) -> pl.DataFrame:
    frame = pl.read_csv(
        text.encode(),
        schema={"interval_start_utc": pl.String, column: pl.String},
    )
    return frame.with_columns(
        pl.col("interval_start_utc").str.to_datetime(
            "%Y-%m-%dT%H:%M:%SZ",
            time_zone="UTC",
        ),
    )


def data_paths(directory: Path, edits: Edits | None = None) -> DataPaths:
    applied = edits or {}
    for name in CSV_FILES:
        (directory / name).write_text(_fixture_text(name, applied), encoding="utf-8")
    for stem, column in GRID_FILES.items():
        text = _fixture_text(f"{stem}.csv", applied)
        grid_frame(text, column).write_parquet(directory / f"{stem}.parquet")
    return DataPaths(
        spp=directory / "ercot_spp_lz_west.parquet",
        load=directory / "ercot_load.parquet",
        chain_daily=directory / "chain_daily.csv",
        difficulty_epochs=directory / "difficulty_epochs.csv",
        btc_price_daily=directory / "btc_price_daily.csv",
    )
