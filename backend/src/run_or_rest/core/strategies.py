from collections.abc import Callable
from dataclasses import dataclass

from run_or_rest.core.models import Decision, DecisionContext, StrategyId


def always_on(_context: DecisionContext) -> Decision:
    return Decision.RUN


def strike_price(context: DecisionContext) -> Decision:
    if context.previous_price_usd_per_mwh > context.breakeven_estimate_usd_per_mwh:
        return Decision.OFF
    return Decision.RUN


def peak_guard_fires(context: DecisionContext) -> bool:
    reference_mw = max(context.previous_month_peak_mw, context.month_to_date_peak_mw)
    return context.previous_load_mw >= context.peak_guard_threshold * reference_mw


def strike_peak_guard(context: DecisionContext) -> Decision:
    if strike_price(context) is Decision.OFF or peak_guard_fires(context):
        return Decision.OFF
    return Decision.RUN


@dataclass(frozen=True)
class Strategy:
    id: StrategyId
    label: str
    decide: Callable[[DecisionContext], Decision]


STRATEGIES = (
    Strategy(StrategyId.ALWAYS_ON, "Always on", always_on),
    Strategy(StrategyId.STRIKE_PRICE, "Strike price", strike_price),
    Strategy(StrategyId.STRIKE_PEAK_GUARD, "Strike + peak guard", strike_peak_guard),
)
