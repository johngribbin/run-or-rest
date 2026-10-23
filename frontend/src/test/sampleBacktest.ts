import type { Backtest } from "../api/backtest.ts";

export const sampleBacktest: Backtest = {
  period: {
    start_utc: "2026-06-01T05:00:00Z",
    end_utc: "2026-06-01T06:00:00Z",
    settlement_point: "LZ_WEST",
  },
  controls: {
    peak_guard_threshold: {
      min: "0.80",
      max: "1.00",
      step: "0.01",
      default: "0.95",
    },
  },
  assumptions: {
    fleet_mw: "1",
    efficiency_j_per_th: "15",
    pool_fee_rate: "0.02",
    transmission_rate_usd_per_mw_year: "50000",
    peak_guard_threshold: "0.95",
  },
  winner: { id: "strike_peak_guard", advantage_over_always_on_usd: "1234.56" },
  strategies: [
    {
      id: "always_on",
      label: "Always on",
      revenue_usd: "200000.00",
      energy_cost_usd: "90000.00",
      transmission_usd: "50000.00",
      net_profit_usd: "60000.00",
      mined_sats: 300000000,
      hours_off: "0.00",
      peaks_running: 1,
      gain_vs_always_on: {
        price_usd: "0.00",
        fourcp_usd: "0.00",
        total_usd: "0.00",
      },
    },
    {
      id: "strike_price",
      label: "Strike price",
      revenue_usd: "190000.00",
      energy_cost_usd: "85000.00",
      transmission_usd: "50000.00",
      net_profit_usd: "55000.00",
      mined_sats: 285000000,
      hours_off: "12.25",
      peaks_running: 1,
      gain_vs_always_on: {
        price_usd: "-5000.00",
        fourcp_usd: "0.00",
        total_usd: "-5000.00",
      },
    },
    {
      id: "strike_peak_guard",
      label: "Strike + peak guard",
      revenue_usd: "150000.00",
      energy_cost_usd: "88765.44",
      transmission_usd: "0.00",
      net_profit_usd: "61234.56",
      mined_sats: 225000000,
      hours_off: "421.50",
      peaks_running: 0,
      gain_vs_always_on: {
        price_usd: "-48765.44",
        fourcp_usd: "50000.00",
        total_usd: "1234.56",
      },
    },
  ],
  fourcp: {
    charge_per_peak_usd: "50000.00",
    lowest_peak_price_usd_per_mwh: "500.00",
    highest_peak_price_usd_per_mwh: "500.00",
    peaks: [
      {
        month: "2026-06",
        interval_start_utc: "2026-06-01T05:15:00Z",
        system_load_mw: "82712.7",
        price_usd_per_mwh: "500.00",
        decisions: {
          always_on: "run",
          strike_price: "run",
          strike_peak_guard: "off",
        },
      },
    ],
  },
  bitcoin: {
    daily: [
      {
        date_utc: "2026-06-01",
        btc_price_usd: "80000.00",
        difficulty: "125000000000000",
        reward_per_block_sats: "315000000",
        fees_share: "0.0079",
        hashprice_usd_per_ph_day: "41.36",
      },
    ],
    difficulty_adjustments: [
      {
        start_utc: "2026-06-01T05:00:00Z",
        difficulty: "125000000000000",
        change_ratio: null,
      },
    ],
    adjustment_count: 0,
  },
  series: [
    {
      interval_start_utc: "2026-06-01T05:00:00Z",
      price_usd_per_mwh: "40.00",
      breakeven_estimate_usd_per_mwh: "100.00",
      decisions: {
        always_on: "run",
        strike_price: "run",
        strike_peak_guard: "off",
      },
    },
    {
      interval_start_utc: "2026-06-01T05:15:00Z",
      price_usd_per_mwh: "500.00",
      breakeven_estimate_usd_per_mwh: "100.00",
      decisions: {
        always_on: "run",
        strike_price: "run",
        strike_peak_guard: "off",
      },
    },
    {
      interval_start_utc: "2026-06-01T05:30:00Z",
      price_usd_per_mwh: "-3.10",
      breakeven_estimate_usd_per_mwh: "100.00",
      decisions: {
        always_on: "run",
        strike_price: "off",
        strike_peak_guard: "run",
      },
    },
    {
      interval_start_utc: "2026-06-01T05:45:00Z",
      price_usd_per_mwh: "41.25",
      breakeven_estimate_usd_per_mwh: "100.00",
      decisions: {
        always_on: "run",
        strike_price: "run",
        strike_peak_guard: "off",
      },
    },
  ],
  data_quality: { expected_intervals: 4, missing_intervals: 0 },
};
