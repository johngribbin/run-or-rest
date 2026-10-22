import { describe, expect, it } from "vitest";
import { sampleBacktest } from "../test/sampleBacktest.ts";
import { chartOption, offBands } from "./option.ts";

describe("offBands", () => {
  it("covers each run of off intervals up to the next interval", () => {
    expect(offBands(sampleBacktest.series, "strike_peak_guard")).toEqual([
      { start: "2026-06-01T05:00:00Z", end: "2026-06-01T05:30:00Z" },
      { start: "2026-06-01T05:45:00Z", end: "2026-06-01T05:45:00Z" },
    ]);
  });

  it("finds a single off interval in the middle", () => {
    expect(offBands(sampleBacktest.series, "strike_price")).toEqual([
      { start: "2026-06-01T05:30:00Z", end: "2026-06-01T05:45:00Z" },
    ]);
  });

  it("has no bands for a strategy that never switches off", () => {
    expect(offBands(sampleBacktest.series, "always_on")).toEqual([]);
  });
});

describe("chartOption", () => {
  const option = chartOption(sampleBacktest, "strike_price");
  const series = Array.isArray(option.series) ? option.series : [];

  it("draws price and breakeven over time", () => {
    expect(series.map((item) => item.name)).toEqual([
      "Price",
      "Breakeven estimate",
    ]);
    expect(series[0]?.data).toEqual([
      ["2026-06-01T05:00:00Z", 40],
      ["2026-06-01T05:15:00Z", 500],
      ["2026-06-01T05:30:00Z", -3.1],
      ["2026-06-01T05:45:00Z", 41.25],
    ]);
  });

  it("shades the selected strategy's off intervals and marks 4CP peaks", () => {
    const price = series[0];

    expect(price?.markArea?.data).toEqual([
      [{ xAxis: "2026-06-01T05:30:00Z" }, { xAxis: "2026-06-01T05:45:00Z" }],
    ]);
    expect(price?.markLine?.data).toEqual([
      { name: "4CP 2026-06", xAxis: "2026-06-01T05:15:00Z" },
    ]);
  });

  it("lets the user zoom", () => {
    expect(option.dataZoom).toEqual([{ type: "inside" }, { type: "slider" }]);
  });
});
