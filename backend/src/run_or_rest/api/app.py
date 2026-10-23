from decimal import Decimal
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from pydantic import AfterValidator, Field

from run_or_rest.api.mapping import to_response
from run_or_rest.api.schemas import BacktestResponse, ErrorResponse
from run_or_rest.config import (
    APP_TITLE,
    GRID_DATA_MISSING_DETAIL,
    HISTORY_START,
    PEAK_GUARD_THRESHOLD_DEFAULT,
    PEAK_GUARD_THRESHOLD_MAX,
    PEAK_GUARD_THRESHOLD_MIN,
    PEAK_GUARD_THRESHOLD_STEP,
    WINDOW_END,
    WINDOW_START,
)
from run_or_rest.core.backtest import run_backtest
from run_or_rest.core.models import BacktestError, default_assumptions
from run_or_rest.data.files import GridDataMissingError
from run_or_rest.data.loader import DataPaths, LoadedData, Ranges, load_data

DEFAULT_RANGES = Ranges(HISTORY_START, WINDOW_START, WINDOW_END)


def _on_step(value: Decimal) -> Decimal:
    if value % PEAK_GUARD_THRESHOLD_STEP:
        msg = f"must be a multiple of {PEAK_GUARD_THRESHOLD_STEP}"
        raise ValueError(msg)
    return value


Threshold = Annotated[
    Decimal,
    Field(ge=PEAK_GUARD_THRESHOLD_MIN, le=PEAK_GUARD_THRESHOLD_MAX),
    AfterValidator(_on_step),
    Query(
        description="Peak guard threshold: fraction of the reference monthly "
        "peak at which the guard switches the fleet off",
    ),
]


def _load(paths: DataPaths, ranges: Ranges) -> LoadedData | None:
    try:
        return load_data(paths, ranges)
    except GridDataMissingError:
        return None


def create_app(
    paths: DataPaths | None = None,
    ranges: Ranges = DEFAULT_RANGES,
) -> FastAPI:
    data = _load(paths or DataPaths(), ranges)
    app = FastAPI(title=APP_TITLE)

    @app.get(
        "/api/backtest",
        responses={500: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
        description="Run the backtest for all three strategies over the window",
    )
    def backtest(
        peak_guard_threshold: Threshold = PEAK_GUARD_THRESHOLD_DEFAULT,
    ) -> BacktestResponse:
        if data is None:
            raise HTTPException(status_code=503, detail=GRID_DATA_MISSING_DETAIL)
        try:
            result = run_backtest(
                data.history,
                data.window,
                ranges.window_start,
                ranges.window_end,
                default_assumptions(peak_guard_threshold),
            )
        except BacktestError as error:
            raise HTTPException(status_code=500, detail=str(error)) from error
        return to_response(result)

    return app
