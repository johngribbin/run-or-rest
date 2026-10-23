import runpy

import pytest

from run_or_rest.config import BITCOIN_RPC_ENV, GRIDSTATUS_API_KEY_ENV


def test_fetch_grid_runs_as_a_module_and_asks_for_its_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(GRIDSTATUS_API_KEY_ENV, raising=False)

    with pytest.raises(SystemExit, match=r"^GRIDSTATUS_API_KEY is not set\."):
        runpy.run_module("scripts.fetch_grid", run_name="__main__")


def test_fetch_chain_runs_as_a_module_and_asks_for_its_rpc_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in BITCOIN_RPC_ENV:
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(SystemExit, match=r"^BITCOIN_RPC_URL is not set\."):
        runpy.run_module("scripts.fetch_chain", run_name="__main__")
