from decimal import ROUND_FLOOR, Decimal

from run_or_rest.config import (
    HASHES_PER_DIFFICULTY,
    HASHES_PER_TERAHASH,
    INTERVAL_HOURS,
    INTERVAL_SECONDS,
    MAX_TARGET,
    SATS_PER_BTC,
    WATTS_PER_MW,
)
from run_or_rest.core.models import Assumptions, DailyChain, DayEconomics, Sats


def _floor(value: Decimal) -> int:
    return int(value.to_integral_value(rounding=ROUND_FLOOR))


def hashrate_hs(fleet_mw: Decimal, efficiency_j_per_th: Decimal) -> int:
    return _floor(fleet_mw * WATTS_PER_MW * HASHES_PER_TERAHASH / efficiency_j_per_th)


def expected_blocks(hashrate: int, seconds: int, difficulty: Decimal) -> Decimal:
    return Decimal(hashrate) * seconds / (difficulty * HASHES_PER_DIFFICULTY)


def reward_per_block_sats(chain: DailyChain) -> Decimal:
    return Decimal(chain.subsidy_sats + chain.fees_sats) / chain.block_count


def net_sats(
    blocks: Decimal, reward_per_block: Decimal, pool_fee_rate: Decimal
) -> Sats:
    return Sats(_floor(blocks * reward_per_block * (1 - pool_fee_rate)))


def revenue_usd(sats: Sats, btc_price_usd: Decimal) -> Decimal:
    return Decimal(sats) * btc_price_usd / SATS_PER_BTC


def energy_cost_usd(fleet_mw: Decimal, price_usd_per_mwh: Decimal) -> Decimal:
    return fleet_mw * INTERVAL_HOURS * price_usd_per_mwh


def breakeven_usd_per_mwh(revenue: Decimal, fleet_mw: Decimal) -> Decimal:
    return revenue / (fleet_mw * INTERVAL_HOURS)


def difficulty_from_bits(bits: str) -> Decimal:
    compact = int(bits, 16)
    exponent = compact >> 24
    mantissa = compact & 0xFFFFFF
    shift = 8 * (exponent - 3)
    numerator = MAX_TARGET << max(0, -shift)
    target = mantissa << max(0, shift)
    return Decimal(numerator) / Decimal(target)


def interval_net_sats(
    assumptions: Assumptions,
    difficulty: Decimal,
    day: DayEconomics,
) -> Sats:
    hashrate = hashrate_hs(assumptions.fleet_mw, assumptions.efficiency_j_per_th)
    blocks = expected_blocks(hashrate, INTERVAL_SECONDS, difficulty)
    reward = reward_per_block_sats(day.chain)
    return net_sats(blocks, reward, assumptions.pool_fee_rate)
