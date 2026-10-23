import { describe, expect, it } from "vitest";
import type { Decision, SeriesPoint } from "../api/backtest.ts";
import { sampleBacktest } from "../test/sampleBacktest.ts";

const strike = sampleBacktest.strategies[1];
if (strike === undefined) {
  throw new Error("The sample needs the strike price strategy");
}
import {
  bandRect,
  chartOption,
  intervalMs,
  offBands,
  priceTick,
  tooltipText,
  zoomFor,
  zoomFromEvent,
} from "./option.ts";

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

describe("priceTick", () => {
  it("labels price ticks with a minus sign and thousands separators", () => {
    expect(priceTick(-1000)).toBe("−1,000");
  });
});

describe("tooltipText", () => {
  it("shows the Central time, both prices and whether the chosen rule was off", () => {
    const point = sampleBacktest.series[2];

    expect(point === undefined ? "" : tooltipText(point, strike)).toBe(
      "Jun 1, 2026, 00:30 CT<br/>Power price: −$3.10/MWh<br/>Breakeven: $100.00/MWh<br/>Strike price: off",
    );
  });
});

describe("chartOption", () => {
  const option = chartOption(sampleBacktest, strike);
  const series = Array.isArray(option.series) ? option.series : [];

  it("draws every price and breakeven point at its Central time", () => {
    expect(option.useUTC).toBe(true);
    const lines = series.flatMap((item) =>
      item.type === "line" ? [item] : [],
    );
    expect(lines.map((item) => item.name)).toEqual([
      "Power price",
      "Breakeven",
    ]);
    expect(lines.map((item) => item.sampling)).toEqual([undefined, undefined]);
    expect(series[0]?.data).toEqual([
      [Date.UTC(2026, 5, 1, 0, 0), 40],
      [Date.UTC(2026, 5, 1, 0, 15), 500],
      [Date.UTC(2026, 5, 1, 0, 30), -3.1],
      [Date.UTC(2026, 5, 1, 0, 45), 41.25],
    ]);
  });

  it("spans the whole window even where intervals are missing", () => {
    expect(option.xAxis).toMatchObject({
      type: "time",
      min: Date.UTC(2026, 5, 1, 0, 0),
      max: Date.UTC(2026, 5, 1, 1, 0),
    });
  });

  it("draws breakeven as a dashed line in the primary ink", () => {
    expect(series[1]).toMatchObject({
      lineStyle: { type: "dashed", color: "#ECEEF1" },
    });
  });

  it("shades the chosen rule's off intervals beneath the lines", () => {
    expect(series[2]).toMatchObject({ type: "custom", z: 1, silent: true });
    expect(series[2]?.data).toEqual([
      [Date.UTC(2026, 5, 1, 0, 30), Date.UTC(2026, 5, 1, 0, 45)],
    ]);
  });

  it("marks each 4CP peak with a short dated label", () => {
    const price = series[0];

    expect(price?.markLine?.data).toEqual([
      { name: "4CP · Jun 1", xAxis: Date.UTC(2026, 5, 1, 0, 15) },
    ]);
  });

  it("draws axes in the muted ink and line colours", () => {
    expect(option.yAxis).toMatchObject({
      axisLabel: { color: "#8C939E" },
      splitLine: { lineStyle: { color: "#232831" } },
    });
  });

  it("zooms with the mouse wheel, pans with a drag, and has a slider", () => {
    expect(option.dataZoom).toMatchObject([
      { type: "inside", zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: "slider" },
    ]);
  });
});

describe("zoom windows", () => {
  const extent = { min: 0, max: 1000 };

  it("turns a time range into a zoom window", () => {
    expect(zoomFor(extent, { min: 250, max: 500 })).toEqual({
      start: 25,
      end: 50,
    });
  });
});

describe("zoomFromEvent", () => {
  it("reads a slider's start and end", () => {
    expect(zoomFromEvent({ start: 10, end: 20 })).toEqual({
      start: 10,
      end: 20,
    });
  });

  it("reads the first entry of a batched inside zoom", () => {
    expect(zoomFromEvent({ batch: [{ start: 5, end: 6 }] })).toEqual({
      start: 5,
      end: 6,
    });
  });

  it("ignores an event without percentages", () => {
    expect(zoomFromEvent({ startValue: 1, endValue: 2 })).toBeNull();
    expect(zoomFromEvent(null)).toBeNull();
  });
});

describe("bandRect", () => {
  const plot = { x: 56, y: 40, width: 1000, height: 264 };

  it("spans the plot's height between an off interval's ends", () => {
    expect(bandRect(300, 340, plot)).toEqual({
      x: 300,
      y: 40,
      width: 40,
      height: 264,
    });
  });

  it("widens an interval thinner than two pixels so it stays visible", () => {
    expect(bandRect(300, 300.1, plot)).toEqual({
      x: 300,
      y: 40,
      width: 2,
      height: 264,
    });
  });

  it("clips at the plot's edges and drops a band outside it", () => {
    expect(bandRect(20, 70, plot)).toEqual({
      x: 56,
      y: 40,
      width: 14,
      height: 264,
    });
    expect(bandRect(1100, 1120, plot)).toBeNull();
  });
});
