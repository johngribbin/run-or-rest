from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Final
from zoneinfo import ZoneInfo

APP_TITLE: Final = "Run or Rest"

FLEET_MW: Final = Decimal(1)
EFFICIENCY_J_PER_TH: Final = Decimal(15)
POOL_FEE_RATE: Final = Decimal("0.02")
TRANSMISSION_RATE_USD_PER_MW_YEAR: Final = Decimal(50000)

PEAK_GUARD_THRESHOLD_DEFAULT: Final = Decimal("0.95")
PEAK_GUARD_THRESHOLD_MIN: Final = Decimal("0.80")
PEAK_GUARD_THRESHOLD_MAX: Final = Decimal("1.00")
PEAK_GUARD_THRESHOLD_STEP: Final = Decimal("0.01")

SETTLEMENT_POINT: Final = "LZ_WEST"
MONTH_TIMEZONE: Final = ZoneInfo("America/Chicago")

INTERVAL_SECONDS: Final = 900
SECONDS_PER_HOUR: Final = 3600
INTERVAL: Final = timedelta(seconds=INTERVAL_SECONDS)
INTERVAL_HOURS: Final = Decimal(INTERVAL_SECONDS) / SECONDS_PER_HOUR
UTC_TIMESTAMP_FORMAT: Final = "%Y-%m-%dT%H:%M:%SZ"
INTERVAL_START_COLUMN: Final = "interval_start_utc"
PRICE_COLUMN: Final = "price_usd_per_mwh"
LOAD_COLUMN: Final = "load_mw"
CHAIN_DAILY_COLUMNS: Final = ("date_utc", "block_count", "subsidy_sats", "fees_sats")
BTC_PRICE_DAILY_COLUMNS: Final = ("date_utc", "price_usd")
DIFFICULTY_EPOCH_COLUMNS: Final = ("start_time_utc", "height", "bits")
WATTS_PER_MW: Final = 10**6
HASHES_PER_TERAHASH: Final = 10**12
HASHES_PER_DIFFICULTY: Final = 2**32
SATS_PER_BTC: Final = 100_000_000
MAX_TARGET: Final = 0xFFFF * 256**26

WINDOW_START: Final = datetime(2026, 6, 1, tzinfo=MONTH_TIMEZONE)
WINDOW_END: Final = datetime(2026, 10, 1, tzinfo=MONTH_TIMEZONE)
HISTORY_START: Final = datetime(2026, 5, 1, tzinfo=MONTH_TIMEZONE)
DAILY_FIRST_DATE_UTC: Final = date(2026, 5, 31)
DAILY_LAST_DATE_UTC: Final = date(2026, 10, 1)
CHAIN_FETCH_START_UTC: Final = datetime(2026, 5, 31, tzinfo=UTC)
CHAIN_FETCH_END_UTC: Final = datetime(2026, 10, 2, tzinfo=UTC)

REPO_ROOT: Final = Path(__file__).resolve().parents[3]
DATA_DIR: Final = REPO_ROOT / "data"
RAW_DATA_DIR: Final = DATA_DIR / "raw"
SPP_PATH: Final = RAW_DATA_DIR / "ercot_spp_lz_west.parquet"
LOAD_PATH: Final = RAW_DATA_DIR / "ercot_load.parquet"
CHAIN_DAILY_PATH: Final = DATA_DIR / "chain_daily.csv"
DIFFICULTY_EPOCHS_PATH: Final = DATA_DIR / "difficulty_epochs.csv"
BTC_PRICE_DAILY_PATH: Final = DATA_DIR / "btc_price_daily.csv"

GRIDSTATUS_API_KEY_ENV: Final = "GRIDSTATUS_API_KEY"
SPP_DATASET: Final = "ercot_spp_real_time_15_min"
LOAD_DATASET: Final = "ercot_load"
BITCOIN_RPC_ENV: Final = ("BITCOIN_RPC_URL", "BITCOIN_RPC_USER", "BITCOIN_RPC_PASSWORD")
RETARGET_INTERVAL_BLOCKS: Final = 2016
COIN_METRICS_ASSET_METRICS_URL: Final = (
    "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics"
)

USD_DECIMAL_PLACES: Final = 2
PRICE_DECIMAL_PLACES: Final = 2
HOURS_DECIMAL_PLACES: Final = 2
LOAD_DECIMAL_PLACES: Final = 1
THRESHOLD_DECIMAL_PLACES: Final = 2
GRID_DATA_MISSING_DETAIL: Final = (
    "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set."
)
