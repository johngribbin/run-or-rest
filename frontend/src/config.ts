export const APP_TITLE = "Run or Rest";
export const APP_SUBTITLE = "ERCOT curtailment backtest for bitcoin miners";

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

export const COLORS = {
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
  price: "#7DB3FF",
  offBand: "#323B4A",
  zoomFill: "rgba(236, 238, 241, 0.14)",
};

export const REFETCH_DEBOUNCE_MS = 300;

export const BACKTEST_PATH = "/api/backtest";
export const THRESHOLD_PARAM = "peak_guard_threshold";

export const ANSWER_LABEL = "Which rule made the most money this summer?";
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
};
export const BITCOIN_COPY = {
  heading: "What sets the breakeven line",
  subtitle:
    "The bitcoin side of the model: each day's breakeven comes from the BTC price, the block reward and the difficulty in effect.",
  formula: {
    btcPrice: "BTC price",
    reward: "Block reward",
    difficulty: "Difficulty",
    hashprice: "Hashprice",
    efficiency: "Efficiency",
    breakeven: "Breakeven $/MWh",
  },
  tiles: {
    btcPrice: "BTC price",
    adjustments: "Difficulty adjustments",
    hashprice: "Hashprice",
    feesShare: "Fees share of reward",
  },
  adjustmentsList: "Difficulty adjustments in this window",
  hashpriceCaption: "USD per PH/s per day, after the pool fee",
  feesCaption: "Transaction fees as a share of subsidy plus fees",
  charts: {
    btcPrice: "BTC price, USD · Coin Metrics",
    difficulty: "Network difficulty, T · change at each adjustment",
    hashprice: "Hashprice, USD per PH/s per day",
  },
};
export const ASSUMPTIONS_HEADING = "Model and assumptions";
export const STRATEGIES_HEADING = "All three rules";
export const GAIN_LABELS = { price: "Price gain", fourcp: "4CP gain" };
export const DATA_QUALITY_LABEL = "Intervals priced";
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
export const RATIO_PERCENT_PLACES = 1;
export const DIFFICULTY_UNIT = { power: 12, places: 1, suffix: "T" };
export const HASHPRICE_UNIT = "/PH/day";
export const THOUSANDS_SEPARATOR = ",";

export const CHART_HEIGHT_PX = 360;
export const SMALL_CHART_HEIGHT_PX = 120;
export const CHART_GRID_PX = { left: 56, right: 24, top: 40, bottom: 56 };
export const OFF_BAND_MIN_PX = 2;
export const CHART_COPY = {
  heading: "Power price vs. mining breakeven",
  subtitleTail:
    "real-time price, $/MWh, Central time. Above the breakeven line, mining loses money.",
  priceAxis: "$/MWh",
  peakLegend: "4CP peak",
  peakMarker: "4CP",
  rangeLabel: "Time range",
  season: "Season",
  offLegend: "Miners off",
  offPicker: "Strategy",
  off: "off",
  running: "running",
  chartLabel: "Power price and breakeven over time, with the 4CP peaks marked",
};
export const DISPLAY_TIME_ZONE = "America/Chicago";
export const DISPLAY_TIME_ZONE_LABEL = "CT";
export const THRESHOLD_LABEL = "Peak guard trigger";
export const THRESHOLD_HELP = (percent: string) =>
  `Switch off when ERCOT demand reaches ${percent} of the month's peak so far.`;
export const THRESHOLD_END_LABELS = {
  min: "off more",
  max: "off less",
};
export const LOADING_TEXT = "Running the backtest…";
export const UPDATING_TEXT = "Updating…";
export const STALE_OPACITY = 0.5;

export const CHART_SERIES_NAMES = {
  price: "Power price",
  breakeven: "Breakeven",
};

export const TOOLTIPS = {
  priceGain:
    "Saved by avoiding expensive power, minus mining revenue given up, compared with always on.",
  fourcpGain: "Transmission charges avoided compared with always on.",
  hashprice:
    "What 1 PH/s of hashrate earns in a day, in USD, after the pool fee.",
  difficulty:
    "How hard it is to find a block. It adjusts every 2,016 blocks, about every two weeks, to keep blocks near 10 minutes apart.",
  blockReward:
    "The new bitcoin each block creates (the subsidy) plus the transaction fees paid to its miner.",
  efficiency: (value: string) =>
    `Energy the fleet uses per terahash in this run: ${value} J/TH. Lower is better.`,
  breakeven:
    "The power price where mining just pays for itself, using yesterday’s bitcoin price and rewards.",
};

export const TOOLTIP_WIDTH_PX = 280;
