import csv
import http.client
import json
import sys
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from urllib.parse import urlencode, urlsplit

from run_or_rest.config import (
    BTC_PRICE_DAILY_COLUMNS,
    BTC_PRICE_DAILY_PATH,
    COIN_METRICS_ASSET_METRICS_URL,
    DAILY_FIRST_DATE_UTC,
    DAILY_LAST_DATE_UTC,
)
from run_or_rest.data import fields
from scripts.common import inclusive_days

MIDNIGHT_SUFFIX = "T00:00:00.000000000Z"
PAGE_SIZE = 1000


@dataclass(frozen=True)
class PriceRow:
    time: str
    price_usd: str


@dataclass(frozen=True)
class DailyPrice:
    date_utc: date
    price_usd: str


@dataclass(frozen=True)
class Page:
    rows: list[PriceRow]
    next_page_url: str | None


def price_url(first: date, last: date) -> str:
    query = urlencode(
        {
            "assets": "btc",
            "metrics": "PriceUSD",
            "frequency": "1d",
            "start_time": first.isoformat(),
            "end_time": last.isoformat(),
            "page_size": PAGE_SIZE,
        },
    )
    return f"{COIN_METRICS_ASSET_METRICS_URL}?{query}"


def _row(entry: object, index: int) -> PriceRow:
    if not isinstance(entry, dict):
        sys.exit(f"Coin Metrics entry {index} is not an object")
    time = entry.get("time")
    price = entry.get("PriceUSD")
    if not isinstance(time, str) or not isinstance(price, str):
        sys.exit(f"Coin Metrics entry {index} lacks a time or PriceUSD string")
    return PriceRow(time, price)


def parse_page(text: str) -> Page:
    payload = json.loads(text)
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        sys.exit("Coin Metrics response has no data list")
    next_page_url = payload.get("next_page_url")
    if next_page_url is not None and not isinstance(next_page_url, str):
        sys.exit("Coin Metrics next_page_url is not a string")
    rows = [_row(entry, index) for index, entry in enumerate(data)]
    return Page(rows, next_page_url)


def _parse_day(time: str) -> date:
    try:
        day = date.fromisoformat(time.removesuffix(MIDNIGHT_SUFFIX))
    except ValueError:
        day = None
    if day is None or not time.endswith(MIDNIGHT_SUFFIX):
        sys.exit(f"Coin Metrics time {time!r} is not midnight UTC")
    return day


def _check_price(text: str, day: date) -> str:
    try:
        fields.positive_decimal(text)
    except ValueError as error:
        sys.exit(f"Coin Metrics {day}: PriceUSD {error}")
    return text


def daily_prices(rows: Iterable[PriceRow], first: date, last: date) -> list[DailyPrice]:
    found: dict[date, DailyPrice] = {}
    for row in rows:
        day = _parse_day(row.time)
        if first <= day <= last:
            found[day] = DailyPrice(day, _check_price(row.price_usd, day))
    days = inclusive_days(first, last)
    missing = [day.isoformat() for day in days if day not in found]
    if missing:
        sys.exit(f"Coin Metrics has no PriceUSD for {missing}")
    return [found[day] for day in days]


def write_prices(prices: Sequence[DailyPrice], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(BTC_PRICE_DAILY_COLUMNS)
        writer.writerows(
            [price.date_utc.isoformat(), price.price_usd] for price in prices
        )


def download(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname:
        sys.exit(f"Refusing to download from {url}")
    connection = http.client.HTTPSConnection(parts.hostname, parts.port, timeout=120)
    connection.request("GET", f"{parts.path}?{parts.query}")
    response = connection.getresponse()
    if response.status != http.client.OK:
        sys.exit(f"Downloading {url} failed with HTTP {response.status}")
    return response.read().decode("utf-8")


def main() -> None:
    rows: list[PriceRow] = []
    url: str | None = price_url(DAILY_FIRST_DATE_UTC, DAILY_LAST_DATE_UTC)
    while url is not None:
        page = parse_page(download(url))
        rows.extend(page.rows)
        url = page.next_page_url
    prices = daily_prices(rows, DAILY_FIRST_DATE_UTC, DAILY_LAST_DATE_UTC)
    write_prices(prices, BTC_PRICE_DAILY_PATH)
    print(f"Wrote {len(prices)} rows to {BTC_PRICE_DAILY_PATH}")


if __name__ == "__main__":
    main()
