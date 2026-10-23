from decimal import Decimal

from run_or_rest.core.economics import (
    breakeven_usd_per_mwh,
    difficulty_from_bits,
    energy_cost_usd,
    expected_blocks,
    fees_share,
    hashprice_usd_per_ph_day,
    hashrate_hs,
    net_sats,
    revenue_usd,
    reward_per_block_sats,
)
from run_or_rest.core.models import DailyChain, DayEconomics, Sats


def test_one_mw_at_25_j_per_th_is_40000_th_per_second() -> None:
    assert hashrate_hs(Decimal(1), Decimal(25)) == 40_000_000_000_000_000


def test_hashrate_is_floored_to_whole_hashes() -> None:
    assert hashrate_hs(Decimal(1), Decimal(15)) == 66_666_666_666_666_666


def test_two_to_the_32_hashes_for_900_seconds_at_difficulty_900_is_one_block() -> None:
    assert expected_blocks(2**32, 900, Decimal(900)) == Decimal(1)


def test_reward_per_block_is_day_subsidy_plus_fees_over_blocks() -> None:
    chain = DailyChain(
        block_count=144,
        subsidy_sats=Sats(45_000_000_000),
        fees_sats=Sats(720_000_000),
    )

    assert reward_per_block_sats(chain) == Decimal(317_500_000)


def test_reward_per_block_is_not_rounded() -> None:
    chain = DailyChain(block_count=3, subsidy_sats=Sats(1), fees_sats=Sats(0))

    assert reward_per_block_sats(chain) == Decimal("0.3333333333333333333333333333")


def test_one_block_at_317_5m_sats_less_2_percent_pool_fee() -> None:
    assert net_sats(Decimal(1), Decimal(317_500_000), Decimal("0.02")) == 311_150_000


def test_net_sats_are_floored() -> None:
    assert net_sats(Decimal("0.5"), Decimal(3), Decimal(0)) == 1


def test_revenue_of_311_15m_sats_at_100k_per_btc() -> None:
    assert revenue_usd(Sats(311_150_000), Decimal(100_000)) == Decimal("311150.00")


def test_energy_cost_of_one_mw_at_40_per_mwh() -> None:
    assert energy_cost_usd(Decimal(1), Decimal(40)) == Decimal("10.00")


def test_negative_price_pays_the_miner_to_consume() -> None:
    assert energy_cost_usd(Decimal(1), Decimal(-20)) == Decimal("-5.00")


def test_breakeven_of_25_dollars_revenue_at_one_mw() -> None:
    assert breakeven_usd_per_mwh(Decimal(25), Decimal(1)) == Decimal("100.00")


def test_genesis_bits_give_difficulty_exactly_one() -> None:
    assert difficulty_from_bits("1d00ffff") == Decimal(1)


def test_one_byte_smaller_exponent_gives_difficulty_256() -> None:
    assert difficulty_from_bits("1c00ffff") == Decimal(256)


def test_exponent_below_three_scales_the_mantissa_down() -> None:
    assert difficulty_from_bits("02000100") == Decimal(
        "2.695953529101130949315647634E+67",
    )


def test_one_ph_per_second_for_a_day_at_the_example_difficulty_is_1_1024_block() -> (
    None
):
    assert expected_blocks(10**15, 86_400, Decimal(20_599_365_234_375)) == Decimal(
        "0.0009765625",
    )


def test_1_1024_block_at_320m_sats_less_2_percent_is_306250_sats() -> None:
    assert (
        net_sats(Decimal("0.0009765625"), Decimal(320_000_000), Decimal("0.02"))
        == 306_250
    )


def test_hashprice_of_one_ph_per_second_for_a_day() -> None:
    day = DayEconomics(
        chain=DailyChain(
            block_count=1,
            subsidy_sats=Sats(320_000_000),
            fees_sats=Sats(0),
        ),
        btc_price_usd=Decimal(80_000),
    )

    assert hashprice_usd_per_ph_day(
        Decimal("0.02"),
        Decimal(20_599_365_234_375),
        day,
    ) == Decimal("245.00")


def test_fees_share_is_fees_over_subsidy_plus_fees() -> None:
    chain = DailyChain(
        block_count=144,
        subsidy_sats=Sats(312_500_000),
        fees_sats=Sats(2_500_000),
    )

    assert fees_share(chain) == Decimal("0.007936507936507936507936507937")
