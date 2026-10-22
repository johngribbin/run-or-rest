from datetime import date
from pathlib import Path

import pytest

from scripts.fetch_price import DailyPrice, daily_prices, parse_csv, write_prices

FIRST = date(2026, 5, 31)
LAST = date(2026, 6, 1)


def test_parse_csv_keeps_rows_as_text() -> None:
    rows = parse_csv("time,PriceUSD,CapMrktCurUSD\n2026-05-31,104123.4567,1\n")

    assert rows == [
        {"time": "2026-05-31", "PriceUSD": "104123.4567", "CapMrktCurUSD": "1"},
    ]


def test_parse_csv_without_price_column_exits() -> None:
    with pytest.raises(SystemExit, match="lacks time or PriceUSD"):
        parse_csv("time,CapMrktCurUSD\n2026-05-31,1\n")


def test_daily_prices_keep_the_daily_range_in_order() -> None:
    rows = [
        {"time": "2026-06-02", "PriceUSD": "3"},
        {"time": "2026-06-01", "PriceUSD": "105000.5"},
        {"time": "2026-05-30", "PriceUSD": "1"},
        {"time": "2026-05-31", "PriceUSD": "104123.4567"},
    ]

    assert daily_prices(rows, FIRST, LAST) == [
        DailyPrice(FIRST, "104123.4567"),
        DailyPrice(LAST, "105000.5"),
    ]


def test_missing_day_exits() -> None:
    rows = [{"time": "2026-05-31", "PriceUSD": "104123.4567"}]

    with pytest.raises(SystemExit, match=r"no PriceUSD for \['2026-06-01'\]"):
        daily_prices(rows, FIRST, LAST)


@pytest.mark.parametrize("price", ["", "abc", "-1", "NaN"])
def test_invalid_price_in_range_exits(price: str) -> None:
    rows = [
        {"time": "2026-05-31", "PriceUSD": price},
        {"time": "2026-06-01", "PriceUSD": "1"},
    ]

    with pytest.raises(SystemExit, match="2026-05-31: PriceUSD"):
        daily_prices(rows, FIRST, LAST)


def test_invalid_date_exits_naming_the_row() -> None:
    with pytest.raises(SystemExit, match="row 2: invalid time"):
        daily_prices([{"time": "31/05/2026", "PriceUSD": "1"}], FIRST, LAST)


def test_written_file_uses_the_spec_schema(tmp_path: Path) -> None:
    path = tmp_path / "btc_price_daily.csv"

    write_prices([DailyPrice(FIRST, "104123.4567")], path)

    assert path.read_text(encoding="utf-8") == (
        "date_utc,price_usd\n2026-05-31,104123.4567\n"
    )
