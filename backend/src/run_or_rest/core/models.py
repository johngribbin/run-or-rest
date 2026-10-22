from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import NewType

Sats = NewType("Sats", int)


class Decision(StrEnum):
    RUN = "run"
    OFF = "off"


class StrategyId(StrEnum):
    ALWAYS_ON = "always_on"
    STRIKE_PRICE = "strike_price"
    STRIKE_PEAK_GUARD = "strike_peak_guard"


@dataclass(frozen=True)
class DailyChain:
    block_count: int
    subsidy_sats: Sats
    fees_sats: Sats


@dataclass(frozen=True)
class DayEconomics:
    chain: DailyChain
    btc_price_usd: Decimal


@dataclass(frozen=True)
class HistoryInterval:
    start: datetime
    price_usd_per_mwh: Decimal | None
    load_mw: Decimal | None


@dataclass(frozen=True)
class WindowInterval:
    start: datetime
    price_usd_per_mwh: Decimal | None
    load_mw: Decimal | None
    difficulty: Decimal
    day: DayEconomics
    previous_day: DayEconomics


@dataclass(frozen=True)
class Assumptions:
    fleet_mw: Decimal
    efficiency_j_per_th: Decimal
    pool_fee_rate: Decimal
    transmission_rate_usd_per_mw_year: Decimal
    peak_guard_threshold: Decimal


@dataclass(frozen=True)
class DecisionContext:
    previous_price_usd_per_mwh: Decimal
    previous_load_mw: Decimal
    breakeven_estimate_usd_per_mwh: Decimal
    previous_month_peak_mw: Decimal
    month_to_date_peak_mw: Decimal
    peak_guard_threshold: Decimal


class BacktestError(ValueError):
    pass
