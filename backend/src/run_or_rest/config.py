from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

APP_TITLE = "Run or Rest"

FLEET_MW = Decimal(1)
EFFICIENCY_J_PER_TH = Decimal(15)
POOL_FEE_RATE = Decimal("0.02")
TRANSMISSION_RATE_USD_PER_MW_YEAR = Decimal(50000)

PEAK_GUARD_THRESHOLD_DEFAULT = Decimal("0.95")
PEAK_GUARD_THRESHOLD_MIN = Decimal("0.80")
PEAK_GUARD_THRESHOLD_MAX = Decimal("1.00")
PEAK_GUARD_THRESHOLD_STEP = Decimal("0.01")

SETTLEMENT_POINT = "LZ_WEST"
MONTH_TIMEZONE = ZoneInfo("America/Chicago")

INTERVAL_SECONDS = 900
INTERVAL = timedelta(seconds=INTERVAL_SECONDS)
INTERVAL_HOURS = Decimal("0.25")
WATTS_PER_MW = 10**6
HASHES_PER_TERAHASH = 10**12
HASHES_PER_DIFFICULTY = 2**32
SATS_PER_BTC = 100_000_000
MAX_TARGET = 0xFFFF * 256**26

WINDOW_START = datetime(2026, 6, 1, tzinfo=MONTH_TIMEZONE)
WINDOW_END = datetime(2026, 10, 1, tzinfo=MONTH_TIMEZONE)
HISTORY_START = datetime(2026, 5, 1, tzinfo=MONTH_TIMEZONE)
DAILY_FIRST_DATE_UTC = date(2026, 5, 31)
DAILY_LAST_DATE_UTC = date(2026, 10, 1)
CHAIN_FETCH_START_UTC = datetime(2026, 5, 31, tzinfo=UTC)
CHAIN_FETCH_END_UTC = datetime(2026, 10, 2, tzinfo=UTC)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
SPP_PATH = RAW_DATA_DIR / "ercot_spp_lz_west.parquet"
LOAD_PATH = RAW_DATA_DIR / "ercot_load.parquet"
CHAIN_DAILY_PATH = DATA_DIR / "chain_daily.csv"
DIFFICULTY_EPOCHS_PATH = DATA_DIR / "difficulty_epochs.csv"
BTC_PRICE_DAILY_PATH = DATA_DIR / "btc_price_daily.csv"

GRIDSTATUS_API_KEY_ENV = "GRIDSTATUS_API_KEY"
SPP_DATASET = "ercot_spp_real_time_15_min"
LOAD_DATASET = "ercot_load"
BITCOIN_RPC_ENV = ("BITCOIN_RPC_URL", "BITCOIN_RPC_USER", "BITCOIN_RPC_PASSWORD")
RETARGET_INTERVAL_BLOCKS = 2016
COIN_METRICS_ASSET_METRICS_URL = (
    "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics"
)
