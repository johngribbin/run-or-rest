export const APP_TITLE = "Run or Rest";
export const APP_SUBTITLE =
  "A transparent ERCOT curtailment backtest for bitcoin miners";
export const REFETCH_DEBOUNCE_MS = 300;

export const BACKTEST_PATH = "/api/backtest";
export const THRESHOLD_PARAM = "peak_guard_threshold";

export const QUESTION =
  "Which curtailment rule made the most money: always on, strike price, or strike price plus peak guard?";

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
export const CHART_COLORS = {
  price: "#1c7ed6",
  breakeven: "#e8590c",
  offBand: "rgba(250, 82, 82, 0.18)",
  peak: "#7048e8",
};
