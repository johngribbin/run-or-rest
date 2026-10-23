import { describe, expect, it } from "vitest";
import type { Decision, SeriesPoint } from "../api/backtest.ts";
import { sampleBacktest } from "../test/sampleBacktest.ts";
import { chartOption, intervalMs, offBands } from "./option.ts";

const FIFTEEN_MINUTES_MS = 900000;

function point(start: string, decision: Decision): SeriesPoint {
  return {
    interval_start_utc: start,
    price_usd_per_mwh: "40.00",
    breakeven_estimate_usd_per_mwh: "100.00",
    decisions: {
      always_on: "run",
      strike_price: decision,
      strike_peak_guard: "run",
    },
  };
}

describe("intervalMs", () => {
  it("is the period divided by the expected intervals", () => {
    expect(intervalMs(sampleBacktest)).toBe(FIFTEEN_MINUTES_MS);
  });
});

describe("offBands", () => {
  it("ends each run at the end of its last off interval", () => {
    expect(
      offBands(sampleBacktest.series, "strike_peak_guard", FIFTEEN_MINUTES_MS),
    ).toEqual([
      { start: "2026-06-01T05:00:00Z", end: "2026-06-01T05:30:00Z" },
      { start: "2026-06-01T05:45:00Z", end: "2026-06-01T06:00:00Z" },
    ]);
  });

  it("finds a single off interval in the middle", () => {
    expect(
      offBands(sampleBacktest.series, "strike_price", FIFTEEN_MINUTES_MS),
    ).toEqual([{ start: "2026-06-01T05:30:00Z", end: "2026-06-01T05:45:00Z" }]);
  });

  it("has no bands for a strategy that never switches off", () => {
    expect(
      offBands(sampleBacktest.series, "always_on", FIFTEEN_MINUTES_MS),
    ).toEqual([]);
  });

  it("does not shade a skipped interval after an off interval", () => {
    const series = [
      point("2026-06-01T15:00:00Z", "off"),
      point("2026-06-01T15:30:00Z", "run"),
    ];

    expect(offBands(series, "strike_price", FIFTEEN_MINUTES_MS)).toEqual([
      { start: "2026-06-01T15:00:00Z", end: "2026-06-01T15:15:00Z" },
    ]);
  });

  it("splits off intervals on either side of a skipped interval", () => {
    const series = [
      point("2026-06-01T15:00:00Z", "off"),
      point("2026-06-01T15:30:00Z", "off"),
    ];

    expect(offBands(series, "strike_price", FIFTEEN_MINUTES_MS)).toEqual([
      { start: "2026-06-01T15:00:00Z", end: "2026-06-01T15:15:00Z" },
      { start: "2026-06-01T15:30:00Z", end: "2026-06-01T15:45:00Z" },
    ]);
  });
});

describe("chartOption", () => {
  const option = chartOption(sampleBacktest, "strike_price");
  const series = Array.isArray(option.series) ? option.series : [];

  it("draws every price and breakeven point at its Central time", () => {
    expect(option.useUTC).toBe(true);
    expect(option.xAxis).toEqual({ type: "time", name: "Central time" });
    expect(series.map((item) => item.name)).toEqual([
      "Price",
      "Breakeven estimate",
    ]);
    expect(series.map((item) => item.sampling)).toEqual([undefined, undefined]);
    expect(series[0]?.data).toEqual([
      [Date.UTC(2026, 5, 1, 0, 0), 40],
      [Date.UTC(2026, 5, 1, 0, 15), 500],
      [Date.UTC(2026, 5, 1, 0, 30), -3.1],
      [Date.UTC(2026, 5, 1, 0, 45), 41.25],
    ]);
  });

  it("shades the selected strategy's off intervals and marks 4CP peaks", () => {
    const price = series[0];

    expect(price?.markArea?.data).toEqual([
      [
        { xAxis: Date.UTC(2026, 5, 1, 0, 30) },
        { xAxis: Date.UTC(2026, 5, 1, 0, 45) },
      ],
    ]);
    expect(price?.markLine?.data).toEqual([
      { name: "4CP 2026-06", xAxis: Date.UTC(2026, 5, 1, 0, 15) },
    ]);
  });

  it("lets the user zoom", () => {
    expect(option.dataZoom).toEqual([{ type: "inside" }, { type: "slider" }]);
  });
});
