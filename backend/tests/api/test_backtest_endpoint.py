from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from run_or_rest.api.app import create_app
from run_or_rest.api.schemas import BacktestResponse, Strategy
from run_or_rest.data.files import DataError
from tests.data.support import RANGES, data_paths

PEAK_HAS_PRICE = {"ercot_load.csv": ("51000.50", "49500.00")}


def client(
    tmp_path: Path, edits: dict[str, tuple[str, str]] | None = None
) -> TestClient:
    return TestClient(create_app(data_paths(tmp_path, edits), RANGES))


def strategies_by_id(body: object) -> dict[str, Strategy]:
    response = BacktestResponse.model_validate(body)
    return {strategy.id.value: strategy for strategy in response.strategies}


def test_backtest_reports_period_controls_and_default_assumptions(
    tmp_path: Path,
) -> None:
    body = client(tmp_path, PEAK_HAS_PRICE).get("/api/backtest").json()

    assert body["period"] == {
        "start_utc": "2026-06-01T05:00:00Z",
        "end_utc": "2026-06-01T05:45:00Z",
        "settlement_point": "LZ_WEST",
    }
    assert body["controls"] == {
        "peak_guard_threshold": {
            "min": "0.80",
            "max": "1.00",
            "step": "0.01",
            "default": "0.95",
        },
    }
    assert body["assumptions"] == {
        "fleet_mw": "1",
        "efficiency_j_per_th": "15",
        "pool_fee_rate": "0.02",
        "transmission_rate_usd_per_mw_year": "50000",
        "peak_guard_threshold": "0.95",
    }


def test_backtest_series_peaks_and_data_quality(tmp_path: Path) -> None:
    body = client(tmp_path, PEAK_HAS_PRICE).get("/api/backtest").json()

    assert [
        (point["interval_start_utc"], point["price_usd_per_mwh"], point["decisions"])
        for point in body["series"]
    ] == [
        (
            "2026-06-01T05:00:00Z",
            "41.25",
            {"always_on": "run", "strike_price": "run", "strike_peak_guard": "off"},
        ),
    ]
    assert body["fourcp"] == {
        "charge_per_peak_usd": "50000.00",
        "peaks": [
            {
                "month": "2026-06",
                "interval_start_utc": "2026-06-01T05:00:00Z",
                "system_load_mw": "50000.0",
                "price_usd_per_mwh": "41.25",
                "decisions": {
                    "always_on": "run",
                    "strike_price": "run",
                    "strike_peak_guard": "off",
                },
            },
        ],
    }
    assert body["data_quality"] == {"expected_intervals": 3, "missing_intervals": 2}


def test_backtest_reports_bitcoin_inputs_by_day_and_adjustments(
    tmp_path: Path,
) -> None:
    body = client(tmp_path, PEAK_HAS_PRICE).get("/api/backtest").json()

    assert body["bitcoin"] == {
        "daily": [
            {
                "date_utc": "2026-06-01",
                "btc_price_usd": "71328.73",
                "difficulty": "1",
                "reward_per_block_sats": "315153666",
                "fees_share": "0.0084",
                "hashprice_usd_per_ph_day": "4431663934875704.48",
            },
        ],
        "difficulty_adjustments": [
            {
                "start_utc": "2026-06-01T05:00:00Z",
                "difficulty": "1",
                "change_ratio": None,
            },
            {
                "start_utc": "2026-06-01T05:15:00Z",
                "difficulty": "256",
                "change_ratio": "255.0000",
            },
        ],
    }


def test_backtest_totals_are_rounded_strings_in_spec_order(tmp_path: Path) -> None:
    body = client(tmp_path, PEAK_HAS_PRICE).get("/api/backtest").json()
    strategies = strategies_by_id(body)
    guard = strategies["strike_peak_guard"]

    assert list(strategies) == ["always_on", "strike_price", "strike_peak_guard"]
    assert strategies["always_on"].energy_cost_usd == "10.31"
    assert strategies["always_on"].transmission_usd == "50000.00"
    assert strategies["always_on"].hours_off == "0.00"
    assert strategies["always_on"].peaks_running == 1
    assert guard.peaks_running == 0
    assert guard.energy_cost_usd == "0.00"
    assert guard.transmission_usd == "0.00"
    assert guard.hours_off == "0.25"
    assert guard.mined_sats == 0
    assert body["winner"] == {
        "id": "always_on",
        "advantage_over_always_on_usd": "0.00",
    }


def test_backtest_reports_the_requested_threshold_unrounded(tmp_path: Path) -> None:
    response = client(tmp_path, PEAK_HAS_PRICE).get(
        "/api/backtest",
        params={"peak_guard_threshold": "0.800"},
    )

    assert response.status_code == 200
    assert response.json()["assumptions"]["peak_guard_threshold"] == "0.800"


@pytest.mark.parametrize("threshold", ["0.79", "1.01", "0.955", "abc", "NaN"])
def test_out_of_range_or_off_step_threshold_returns_422(
    tmp_path: Path,
    threshold: str,
) -> None:
    response = client(tmp_path, PEAK_HAS_PRICE).get(
        "/api/backtest",
        params={"peak_guard_threshold": threshold},
    )

    assert response.status_code == 422


def test_missing_grid_file_returns_503_with_instructions(tmp_path: Path) -> None:
    paths = data_paths(tmp_path, PEAK_HAS_PRICE)
    paths.spp.unlink()

    response = TestClient(create_app(paths, RANGES)).get("/api/backtest")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set.",
    }


def test_fourcp_peak_without_price_returns_500_with_detail(tmp_path: Path) -> None:
    response = client(tmp_path).get("/api/backtest")

    assert response.status_code == 500
    assert response.json() == {
        "detail": "4CP peak interval 2026-06-01T05:15:00Z has no price",
    }


def test_invalid_committed_file_refuses_to_start(tmp_path: Path) -> None:
    paths = data_paths(tmp_path, {"chain_daily.csv": (",144,", ",x,")})

    with pytest.raises(DataError, match=r"chain_daily\.csv row 2"):
        create_app(paths, RANGES)


def test_every_response_field_has_a_description(tmp_path: Path) -> None:
    schemas = client(tmp_path).get("/openapi.json").json()["components"]["schemas"]
    framework_models = {"HTTPValidationError", "ValidationError"}
    models = [name for name in schemas if name not in framework_models]

    fields = {
        f"{name}.{field}": spec
        for name in models
        for field, spec in schemas[name].get("properties", {}).items()
    }
    undescribed = [name for name, spec in fields.items() if "description" not in spec]
    assert {"BacktestResponse.data_quality", "Strategy.hours_off"} <= fields.keys()
    assert undescribed == []
