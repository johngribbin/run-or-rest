from pydantic import BaseModel, ConfigDict, Field

from run_or_rest.core.models import Decision, StrategyId


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Period(_Model):
    start_utc: str = Field(description="Window start in UTC (section 6.1)")
    end_utc: str = Field(description="Window end in UTC (section 6.1)")
    settlement_point: str = Field(description="The settlement point priced")


class ThresholdControl(_Model):
    min: str = Field(description="Lowest allowed value")
    max: str = Field(description="Highest allowed value")
    step: str = Field(description="Allowed step between values")
    default: str = Field(description="Value used when the parameter is omitted")


class Controls(_Model):
    peak_guard_threshold: ThresholdControl = Field(
        description="Allowed range, step and default of peak_guard_threshold",
    )


class Assumptions(_Model):
    fleet_mw: str = Field(description="Fleet size in MW")
    efficiency_j_per_th: str = Field(description="Fleet efficiency in J/TH")
    pool_fee_rate: str = Field(description="Share of rewards the pool keeps")
    transmission_rate_usd_per_mw_year: str = Field(
        description="4CP transmission rate in USD per MW-year",
    )
    peak_guard_threshold: str = Field(
        description="The peak_guard_threshold used for this request",
    )


class Winner(_Model):
    id: StrategyId = Field(description="The strategy with the highest net profit")
    advantage_over_always_on_usd: str = Field(
        description="How much more the winner made than always on, in USD",
    )


class Gain(_Model):
    price_usd: str = Field(description="Gain from avoiding high power prices, USD")
    fourcp_usd: str = Field(description="Gain from avoiding 4CP charges, USD")
    total_usd: str = Field(description="Total gain over always on, USD")


class Strategy(_Model):
    id: StrategyId = Field(description="Strategy id")
    label: str = Field(description="Strategy label")
    revenue_usd: str = Field(description="Mining revenue, USD")
    energy_cost_usd: str = Field(description="Energy cost, USD")
    transmission_usd: str = Field(description="4CP transmission charge, USD")
    net_profit_usd: str = Field(
        description="Revenue minus energy cost minus transmission, USD",
    )
    mined_sats: int = Field(description="Net sats mined")
    hours_off: str = Field(description="Hours the fleet was switched off")
    gain_vs_always_on: Gain = Field(
        description="Gain over always on split into price, 4CP and total; "
        "zero for always on itself",
    )


class FourCpPeak(_Model):
    month: str = Field(description="Peak month, YYYY-MM")
    interval_start_utc: str = Field(description="Start of the peak interval in UTC")
    system_load_mw: str = Field(description="ERCOT system load at the peak, MW")


class Decisions(_Model):
    always_on: Decision = Field(description="The always_on strategy's decision")
    strike_price: Decision = Field(description="The strike_price strategy's decision")
    strike_peak_guard: Decision = Field(
        description="The strike_peak_guard strategy's decision",
    )


class SeriesPoint(_Model):
    interval_start_utc: str = Field(description="Interval start in UTC")
    price_usd_per_mwh: str = Field(description="The interval's actual price")
    breakeven_estimate_usd_per_mwh: str = Field(
        description="The breakeven estimate the strategies decided on (section 3.7)",
    )
    decisions: Decisions = Field(description="Each strategy's decision")


class DataQuality(_Model):
    expected_intervals: int = Field(description="Window intervals expected")
    missing_intervals: int = Field(
        description="Window intervals skipped for missing data (section 6.5)",
    )


class BacktestResponse(_Model):
    period: Period = Field(
        description="The window's start and end in UTC (section 6.1) and the "
        "settlement point priced",
    )
    controls: Controls = Field(
        description="The allowed range, step and default of each request "
        "parameter; the UI builds its controls from these instead of copying "
        "the values",
    )
    assumptions: Assumptions = Field(
        description="The inputs this run used: the defaults in section 10 and "
        "the request's peak_guard_threshold",
    )
    winner: Winner = Field(
        description="The strategy with the highest net profit (section 5.3) and "
        "how much more it made than always on",
    )
    strategies: list[Strategy] = Field(
        description="One entry per strategy, in the order always_on, "
        "strike_price, strike_peak_guard: the totals in section 5.3, and "
        "gain_vs_always_on split into price, 4CP and total (zero for always_on "
        "itself)",
    )
    fourcp_peaks: list[FourCpPeak] = Field(
        description="The 4CP peak intervals (section 5.1), one per peak month, "
        "with the system load at each",
    )
    series: list[SeriesPoint] = Field(
        description="One entry per non-skipped window interval: the actual "
        "price, the breakeven estimate the strategies decided on (section 3.7), "
        "and each strategy's decision",
    )
    data_quality: DataQuality = Field(
        description="Window intervals expected and how many were skipped for "
        "missing data (section 6.5)",
    )


class ErrorResponse(_Model):
    detail: str = Field(description="What went wrong")
