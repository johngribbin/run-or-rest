import csv
import http.client
import io
import sys
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlsplit

from run_or_rest.config import (
    BTC_PRICE_DAILY_PATH,
    COIN_METRICS_BTC_CSV_URL,
    DAILY_FIRST_DATE_UTC,
    DAILY_LAST_DATE_UTC,
)


@dataclass(frozen=True)
class DailyPrice:
    date_utc: date
    price_usd: str


def _parse_date(text: str, line: int) -> date:
    try:
        return date.fromisoformat(text)
    except ValueError:
        sys.exit(f"Coin Metrics row {line}: invalid time {text!r}")


def _check_price(text: str, day: date) -> str:
    try:
        value = Decimal(text)
    except InvalidOperation:
        sys.exit(f"Coin Metrics {day}: PriceUSD {text!r} is not a decimal")
    if not value.is_finite() or value <= 0:
        sys.exit(f"Coin Metrics {day}: PriceUSD {text!r} is not a positive price")
    return text


def daily_prices(
    rows: Iterable[dict[str, str]], first: date, last: date
) -> list[DailyPrice]:
    found: dict[date, DailyPrice] = {}
    for line, row in enumerate(rows, start=2):
        day = _parse_date(row.get("time", ""), line)
        if first <= day <= last:
            found[day] = DailyPrice(day, _check_price(row.get("PriceUSD", ""), day))
    days = [first + timedelta(days=offset) for offset in range((last - first).days + 1)]
    missing = [day.isoformat() for day in days if day not in found]
    if missing:
        sys.exit(f"Coin Metrics has no PriceUSD for {missing}")
    return [found[day] for day in days]


def parse_csv(text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(text))
    columns = reader.fieldnames or []
    if "time" not in columns or "PriceUSD" not in columns:
        sys.exit(f"Coin Metrics CSV lacks time or PriceUSD; it has {columns}")
    return list(reader)


def write_prices(prices: Sequence[DailyPrice], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["date_utc", "price_usd"])
        writer.writerows(
            [price.date_utc.isoformat(), price.price_usd] for price in prices
        )


def download(url: str) -> str:
    parts = urlsplit(url)
    connection = http.client.HTTPSConnection(parts.netloc, timeout=120)
    connection.request("GET", parts.path)
    response = connection.getresponse()
    if response.status != http.client.OK:
        sys.exit(f"Downloading {url} failed with HTTP {response.status}")
    return response.read().decode("utf-8")


def main() -> None:
    rows = parse_csv(download(COIN_METRICS_BTC_CSV_URL))
    prices = daily_prices(rows, DAILY_FIRST_DATE_UTC, DAILY_LAST_DATE_UTC)
    write_prices(prices, BTC_PRICE_DAILY_PATH)
    print(f"Wrote {len(prices)} rows to {BTC_PRICE_DAILY_PATH}")


if __name__ == "__main__":
    main()
