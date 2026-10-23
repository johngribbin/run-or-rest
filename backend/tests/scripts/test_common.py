from datetime import date

import pytest

from scripts.common import inclusive_days, require_env


def test_require_env_returns_the_value() -> None:
    value = require_env("GRIDSTATUS_API_KEY", {"GRIDSTATUS_API_KEY": "k"}, "Set it.")

    assert value == "k"


def test_require_env_exits_with_the_hint_when_missing() -> None:
    with pytest.raises(
        SystemExit,
        match=r"^BITCOIN_RPC_PASSWORD is not set\. Export it and retry\.$",
    ):
        require_env("BITCOIN_RPC_PASSWORD", {}, "Export it and retry.")


def test_inclusive_days_include_both_ends() -> None:
    assert inclusive_days(date(2026, 5, 31), date(2026, 6, 2)) == [
        date(2026, 5, 31),
        date(2026, 6, 1),
        date(2026, 6, 2),
    ]


def test_inclusive_days_of_one_day() -> None:
    assert inclusive_days(date(2026, 6, 1), date(2026, 6, 1)) == [date(2026, 6, 1)]
