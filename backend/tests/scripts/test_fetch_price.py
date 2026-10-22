from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest

from scripts.fetch_price import (
    DailyPrice,
    Page,
    PriceRow,
    daily_prices,
    parse_page,
    price_url,
    write_prices,
)

FIRST = date(2026, 5, 31)
LAST = date(2026, 6, 1)
MAY_31 = "2026-05-31T00:00:00.000000000Z"
JUNE_1 = "2026-06-01T00:00:00.000000000Z"


def test_price_url_asks_for_daily_btc_price_over_the_range() -> None:
    url = urlsplit(price_url(FIRST, LAST))

    assert (url.scheme, url.hostname, url.path) == (
        "https",
        "community-api.coinmetrics.io",
        "/v4/timeseries/asset-metrics",
    )
    assert parse_qs(url.query) == {
        "assets": ["btc"],
        "metrics": ["PriceUSD"],
        "frequency": ["1d"],
        "start_time": ["2026-05-31"],
        "end_time": ["2026-06-01"],
        "page_size": ["1000"],
    }


def test_parse_page_reads_rows_and_next_page() -> None:
    text = (
        '{"data": [{"asset": "btc", "time": "2026-05-31T00:00:00.000000000Z",'
        ' "PriceUSD": "104123.4567"}], "next_page_url": "https://next"}'
    )

    assert parse_page(text) == Page([PriceRow(MAY_31, "104123.4567")], "https://next")


def test_last_page_has_no_next_page() -> None:
    assert parse_page('{"data": []}') == Page([], None)


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ('{"error": {"type": "bad_request"}}', "no data list"),
        ('{"data": ["x"]}', "entry 0 is not an object"),
        ('{"data": [{"time": "2026-05-31T00:00:00.000000000Z"}]}', "entry 0 lacks"),
        ('{"data": [], "next_page_url": 3}', "next_page_url is not a string"),
    ],
)
def test_malformed_page_exits(text: str, message: str) -> None:
    with pytest.raises(SystemExit, match=message):
        parse_page(text)


def test_daily_prices_keep_the_daily_range_in_order() -> None:
    rows = [
        PriceRow("2026-06-02T00:00:00.000000000Z", "3"),
        PriceRow(JUNE_1, "105000.5"),
        PriceRow("2026-05-30T00:00:00.000000000Z", "1"),
        PriceRow(MAY_31, "104123.4567"),
    ]

    assert daily_prices(rows, FIRST, LAST) == [
        DailyPrice(FIRST, "104123.4567"),
        DailyPrice(LAST, "105000.5"),
    ]


def test_missing_day_exits() -> None:
    with pytest.raises(SystemExit, match=r"no PriceUSD for \['2026-06-01'\]"):
        daily_prices([PriceRow(MAY_31, "104123.4567")], FIRST, LAST)


@pytest.mark.parametrize("price", ["", "abc", "-1", "NaN"])
def test_invalid_price_in_range_exits(price: str) -> None:
    rows = [PriceRow(MAY_31, price), PriceRow(JUNE_1, "1")]

    with pytest.raises(SystemExit, match="2026-05-31: PriceUSD"):
        daily_prices(rows, FIRST, LAST)


@pytest.mark.parametrize(
    "time",
    ["2026-05-31", "2026-05-31T12:00:00.000000000Z", "31/05/2026T00:00:00.000000000Z"],
)
def test_time_that_is_not_midnight_utc_exits(time: str) -> None:
    with pytest.raises(SystemExit, match="is not midnight UTC"):
        daily_prices([PriceRow(time, "1")], FIRST, LAST)


def test_written_file_uses_the_spec_schema(tmp_path: Path) -> None:
    path = tmp_path / "btc_price_daily.csv"

    write_prices([DailyPrice(FIRST, "104123.4567")], path)

    assert path.read_text(encoding="utf-8") == (
        "date_utc,price_usd\n2026-05-31,104123.4567\n"
    )
