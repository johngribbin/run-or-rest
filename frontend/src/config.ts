export const APP_TITLE = "Run or Rest";
export const APP_SUBTITLE = "ERCOT curtailment backtest for bitcoin miners";

export const DEFAULT_COLOR_SCHEME = "dark";
export const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const FONT_SIZES_PX = {
  label: 12,
  body: 14,
  title: 16,
  kpi: 24,
  hero: 40,
};
export const RADIUS_PX = 12;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceRaised: string;
  line: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  good: string;
  bad: string;
  price: string;
  peak: string;
  lane: string;
}

export const COLOR_TOKENS: { dark: ColorTokens; light: ColorTokens } = {
  dark: {
    background: "#0A0C0F",
    surface: "#111418",
    surfaceRaised: "#171B21",
    line: "#232831",
    text: "#ECEEF1",
    textSecondary: "#A9AFB8",
    textMuted: "#8C939E",
    accent: "#F7931A",
    accentSoft: "rgba(247, 147, 26, 0.12)",
    good: "#3FB97A",
    bad: "#F06A5B",
    price: "#4C8DF6",
    peak: "#9085E9",
    lane: "#5B6370",
  },
  light: {
    background: "#F5F6F8",
    surface: "#FFFFFF",
    surfaceRaised: "#F1F3F6",
    line: "#E3E6EB",
    text: "#0E1116",
    textSecondary: "#454C57",
    textMuted: "#646B76",
    accent: "#A85200",
    accentSoft: "rgba(168, 82, 0, 0.08)",
    good: "#117A45",
    bad: "#C2372A",
    price: "#2A78D6",
    peak: "#6250D6",
    lane: "#B4BAC4",
  },
};

export const COLOR_SCHEME_TOGGLE_LABELS = {
  dark: "Switch to light theme",
  light: "Switch to dark theme",
};
export const REFETCH_DEBOUNCE_MS = 300;

export const BACKTEST_PATH = "/api/backtest";
export const THRESHOLD_PARAM = "peak_guard_threshold";

export const ANSWER_LABEL = "Which rule made the most money this summer?";
export const BRIDGE_TITLE = "Where the extra profit came from";
export const GAIN_LABELS = { price: "Price gain", fourcp: "4CP gain" };
export const STRATEGY_DESCRIPTIONS = {
  always_on:
    "Never switches off. The baseline every other rule is measured against.",
  strike_price:
    "Switches off when the last 15 minutes’ power price was above breakeven.",
  strike_peak_guard:
    "Strike price, plus switching off when grid demand nears the month’s peak.",
};
export const FOURCP_EXPLAINER = {
  label: "New to ERCOT?",
  heading: "4CP: four 15-minute windows that set a year of transmission cost",
  intro:
    "Each summer month, ERCOT marks the single 15 minutes when Texas used the most power. How much your site draws in those four intervals sets next year's transmission charge.",
  chargeLead: "Every peak you run through costs this fleet",
  chargeTail:
    "Nobody knows the exact peak in advance, so the peak guard powers down whenever demand gets close to the month's high.",
  calloutTitle: "Peaks are not price spikes",
  calloutTail: "A price-only rule cannot see a peak coming.",
  running: "Running",
  off: "Off",
  load: "Grid demand",
  price: "Power price",
};
export const BEST_BADGE = "Best";
export const BASELINE_DELTA = "Baseline";
export const KPI_LABELS = {
  netProfit: "Net profit",
  btcMined: "BTC mined",
  hoursOff: "Hours off",
  peaksRunIn: "4CP peaks run in",
};

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
export const PLUS_SIGN = "+";
export const SATS_DECIMAL_PLACES = 8;
export const BTC_DISPLAY_PLACES = 4;
export const HOURS_SUMMARY_PLACES = 1;
export const THOUSANDS_SEPARATOR = ",";

export const CHART_HEIGHT_PX = 420;
export const DISPLAY_TIME_ZONE = "America/Chicago";
export const DISPLAY_TIME_ZONE_LABEL = "CT";
export const CHART_TIME_AXIS_NAME = "Central time";
export const THRESHOLD_LABEL = "Peak guard trigger";
export const THRESHOLD_HELP =
  "Switch off when ERCOT demand reaches this share of the month's peak so far.";
export const THRESHOLD_END_LABELS = {
  min: "off more often",
  max: "off less",
};
export const UPDATING_TEXT = "Updating…";
export const STALE_OPACITY = 0.5;

export const CHART_SERIES_NAMES = {
  price: "Price",
  breakeven: "Breakeven estimate",
};
export const CHART_COLORS = {
  price: "#1c7ed6",
  breakeven: "#e8590c",
  offBand: "rgba(250, 82, 82, 0.18)",
  peak: "#7048e8",
};

export const TOOLTIPS = {
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
