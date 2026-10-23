import type { StrategyId } from "./api/backtest.ts";

export const APP_TITLE = "Run or Rest";
export const APP_SUBTITLE =
  "A transparent ERCOT curtailment backtest for bitcoin miners";
export const REFETCH_DEBOUNCE_MS = 300;

export const BACKTEST_PATH = "/api/backtest";
export const THRESHOLD_PARAM = "peak_guard_threshold";

export const QUESTION: readonly (
  string | { strategy: StrategyId; text: string }
)[] = [
  "Which curtailment rule made the most money: ",
  { strategy: "always_on", text: "always on" },
  ", ",
  { strategy: "strike_price", text: "strike price" },
  ", or ",
  { strategy: "strike_peak_guard", text: "strike price plus peak guard" },
  "?",
];

export const MODEL_ASSUMPTIONS = [
  "The fleet pays the LZ_WEST real-time settlement point price for every interval it runs (index pricing).",
  "The pool pays FPPS: the expected share of subsidy and fees every interval, regardless of luck.",
  "The fleet switches fully on or off instantly; no partial load.",
  "The full next-year 4CP transmission charge is attributed to this season.",
  "Excluded: hardware, hosting and staffing costs; demand response and ancillary service payments; retail adders and other bill components.",
];

export const GRID_STATUS_URL = "https://www.gridstatus.io/";
export const COIN_METRICS_URL = "https://coinmetrics.io/";
export const COIN_METRICS_LICENCE_URL =
  "https://creativecommons.org/licenses/by-nc/4.0/";

export const MINUS_SIGN = "−";
export const THOUSANDS_SEPARATOR = ",";

export const CHART_HEIGHT_PX = 420;
export const CHART_TIME_ZONE = "America/Chicago";
export const CHART_TIME_AXIS_NAME = "Central time";
export const CHART_COLORS = {
  price: "#1c7ed6",
  breakeven: "#e8590c",
  offBand: "rgba(250, 82, 82, 0.18)",
  peak: "#7048e8",
};

export const TOOLTIPS = {
  peakGuardThreshold:
    "Switch off when grid demand reaches this share of the month’s highest demand so far (or last month’s, if higher), to dodge the 4CP peaks.",
  strategies: {
    always_on: "Never switches off. The baseline.",
    strike_price:
      "Switches off when the last 15 minutes’ power price was above breakeven.",
    strike_peak_guard:
      "Strike price, plus switching off when grid demand nears the month’s peak.",
  },
  transmission:
    "Next year’s charge, set by power used during this summer’s four 4CP peak intervals.",
  hoursOff: "Total time the fleet was switched off.",
  priceGain:
    "Saved by avoiding expensive power, minus mining revenue given up, compared with always on.",
  fourcpGain: "Transmission charges avoided compared with always on.",
  breakevenEstimate:
    "The power price where mining just pays for itself, using yesterday’s bitcoin price and rewards.",
};

export const TOOLTIP_WIDTH_PX = 280;
