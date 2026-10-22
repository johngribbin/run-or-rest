import base64
import csv
import http.client
import json
import os
import sys
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from urllib.parse import urlsplit

from run_or_rest.config import (
    BITCOIN_RPC_ENV,
    CHAIN_DAILY_PATH,
    CHAIN_FETCH_END_UTC,
    CHAIN_FETCH_START_UTC,
    DAILY_FIRST_DATE_UTC,
    DAILY_LAST_DATE_UTC,
    DIFFICULTY_EPOCHS_PATH,
    RETARGET_INTERVAL_BLOCKS,
)

FIRST_BLOCK_SEARCH_MARGIN = RETARGET_INTERVAL_BLOCKS
BLOCK_STATS = ["height", "time", "subsidy", "totalfee"]


@dataclass(frozen=True)
class Block:
    height: int
    time: int
    subsidy_sats: int
    fees_sats: int
    bits: str


@dataclass(frozen=True)
class DailyTotal:
    date_utc: date
    block_count: int
    subsidy_sats: int
    fees_sats: int


@dataclass(frozen=True)
class DifficultyRow:
    start_time_utc: datetime
    height: int
    bits: str


def lowest_height_where(predicate: Callable[[int], bool], low: int, high: int) -> int:
    while low < high:
        middle = (low + high) // 2
        if predicate(middle):
            high = middle
        else:
            low = middle + 1
    return low


def first_height_at_or_after(
    timestamp: int,
    tip: int,
    time_at: Callable[[int], int],
    mediantime_at: Callable[[int], int],
) -> int:
    settled = lowest_height_where(lambda h: mediantime_at(h) >= timestamp, 0, tip)
    low = max(0, settled - FIRST_BLOCK_SEARCH_MARGIN)
    for height in range(low, min(settled + 1, tip) + 1):
        if time_at(height) >= timestamp:
            return height
    sys.exit(f"No block with time at or after {timestamp} up to height {tip}")


def last_height_before(
    timestamp: int,
    tip: int,
    time_at: Callable[[int], int],
    mediantime_at: Callable[[int], int],
) -> int:
    if mediantime_at(tip) < timestamp:
        sys.exit(f"The node's chain does not yet reach {timestamp}; wait for sync")
    settled = lowest_height_where(lambda h: mediantime_at(h) >= timestamp, 0, tip)
    for height in range(settled, -1, -1):
        if time_at(height) < timestamp:
            return height
    sys.exit(f"No block with time before {timestamp}")


def retarget_height(height: int) -> int:
    return height // RETARGET_INTERVAL_BLOCKS * RETARGET_INTERVAL_BLOCKS


def block_date(block: Block) -> date:
    return datetime.fromtimestamp(block.time, UTC).date()


def daily_totals(blocks: Iterable[Block], first: date, last: date) -> list[DailyTotal]:
    totals: dict[date, DailyTotal] = {}
    for block in blocks:
        day = block_date(block)
        if first <= day <= last:
            current = totals.get(day, DailyTotal(day, 0, 0, 0))
            totals[day] = DailyTotal(
                day,
                current.block_count + 1,
                current.subsidy_sats + block.subsidy_sats,
                current.fees_sats + block.fees_sats,
            )
    days = [first + timedelta(days=offset) for offset in range((last - first).days + 1)]
    missing = [day.isoformat() for day in days if day not in totals]
    if missing:
        sys.exit(f"No blocks found on {missing}")
    return [totals[day] for day in days]


def difficulty_rows(blocks: Sequence[Block]) -> list[DifficultyRow]:
    rows: list[DifficultyRow] = []
    previous_bits = None
    for block in blocks:
        if block.bits != previous_bits:
            start = datetime.fromtimestamp(block.time, UTC)
            rows.append(DifficultyRow(start, block.height, block.bits))
            previous_bits = block.bits
    return rows


def utc_timestamp(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_daily(rows: Sequence[DailyTotal], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["date_utc", "block_count", "subsidy_sats", "fees_sats"])
        writer.writerows(
            [r.date_utc.isoformat(), r.block_count, r.subsidy_sats, r.fees_sats]
            for r in rows
        )


def write_difficulty(rows: Sequence[DifficultyRow], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["start_time_utc", "height", "bits"])
        writer.writerows(
            [utc_timestamp(r.start_time_utc), r.height, r.bits] for r in rows
        )


class Rpc:
    def __init__(self, url: str, user: str, password: str) -> None:
        parts = urlsplit(url)
        if parts.scheme not in {"http", "https"} or not parts.hostname:
            sys.exit(f"{BITCOIN_RPC_ENV[0]} must be an http(s) URL with a host")
        connection_type = (
            http.client.HTTPSConnection
            if parts.scheme == "https"
            else http.client.HTTPConnection
        )
        self._connection = connection_type(parts.hostname, parts.port, timeout=60)
        self._path = parts.path or "/"
        token = base64.b64encode(f"{user}:{password}".encode()).decode()
        self._headers = {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        }

    def call(self, method: str, params: list[object]) -> object:
        body = json.dumps(
            {"jsonrpc": "1.0", "id": method, "method": method, "params": params}
        )
        self._connection.request("POST", self._path, body, self._headers)
        response = self._connection.getresponse()
        payload = json.loads(response.read() or b"{}")
        error = payload.get("error")
        if response.status != http.client.OK or error:
            sys.exit(f"RPC {method} failed with HTTP {response.status}: {error}")
        return payload["result"]

    def header(self, height: int) -> dict[str, object]:
        block_hash = self.call("getblockhash", [height])
        header = self.call("getblockheader", [block_hash])
        if not isinstance(header, dict):
            sys.exit(f"Unexpected getblockheader result at height {height}")
        return header

    def block(self, height: int) -> Block:
        block_hash = self.call("getblockhash", [height])
        stats = self.call("getblockstats", [block_hash, BLOCK_STATS])
        header = self.call("getblockheader", [block_hash])
        if not isinstance(stats, dict) or not isinstance(header, dict):
            sys.exit(f"Unexpected block data at height {height}")
        return Block(
            height=int(stats["height"]),
            time=int(stats["time"]),
            subsidy_sats=int(stats["subsidy"]),
            fees_sats=int(stats["totalfee"]),
            bits=str(header["bits"]),
        )


def require_env(name: str, environ: Mapping[str, str]) -> str:
    value = environ.get(name, "")
    if not value:
        sys.exit(f"{name} is not set")
    return value


def main() -> None:
    url, user, password = (require_env(name, os.environ) for name in BITCOIN_RPC_ENV)
    rpc = Rpc(url, user, password)
    tip = int(str(rpc.call("getblockcount", [])))

    def time_at(height: int) -> int:
        return int(str(rpc.header(height)["time"]))

    def mediantime_at(height: int) -> int:
        return int(str(rpc.header(height)["mediantime"]))

    start = int(CHAIN_FETCH_START_UTC.timestamp())
    end = int(CHAIN_FETCH_END_UTC.timestamp())
    first = first_height_at_or_after(start, tip, time_at, mediantime_at)
    last = last_height_before(end, tip, time_at, mediantime_at)
    heights = range(retarget_height(first), last + 1)
    print(f"Fetching blocks {heights.start} to {heights.stop - 1}")
    blocks = [rpc.block(height) for height in heights]
    CHAIN_DAILY_PATH.parent.mkdir(parents=True, exist_ok=True)
    write_daily(
        daily_totals(blocks, DAILY_FIRST_DATE_UTC, DAILY_LAST_DATE_UTC),
        CHAIN_DAILY_PATH,
    )
    write_difficulty(difficulty_rows(blocks), DIFFICULTY_EPOCHS_PATH)
    print(f"Wrote {CHAIN_DAILY_PATH} and {DIFFICULTY_EPOCHS_PATH}")


if __name__ == "__main__":
    main()
