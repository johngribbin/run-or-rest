import { describe, expect, it } from "vitest";
import { sampleBacktest } from "../test/sampleBacktest.ts";
import {
  adjustmentAt,
  btcPriceOption,
  dayTime,
  adjustmentTooltip,
  difficultyOption,
  hashpriceOption,
} from "./bitcoinOptions.ts";

function firstSeries(option: ReturnType<typeof btcPriceOption>) {
  return Array.isArray(option.series) ? option.series[0] : undefined;
}

describe("dayTime", () => {
  it("places a UTC day at its midday on the Central chart clock", () => {
    expect(dayTime({ ...sampleDay(), date_utc: "2026-06-01" })).toBe(
      Date.UTC(2026, 5, 1, 7, 0),
    );
  });
});

function sampleDay() {
  const day = sampleBacktest.bitcoin.daily[0];
  if (day === undefined) {
    throw new Error("The sample needs a bitcoin day");
  }
  return day;
}

describe("btcPriceOption and hashpriceOption", () => {
  it("plot each day's BTC price and hashprice on the window's axis", () => {
    const price = btcPriceOption(sampleBacktest);
    const hashprice = hashpriceOption(sampleBacktest);

    expect(firstSeries(price)?.data).toEqual([
      [Date.UTC(2026, 5, 1, 7, 0), 80000],
    ]);
    expect(firstSeries(hashprice)?.data).toEqual([
      [Date.UTC(2026, 5, 1, 7, 0), 41.36],
    ]);
    expect(price.xAxis).toMatchObject({
      min: Date.UTC(2026, 5, 1, 0, 0),
      max: Date.UTC(2026, 5, 1, 1, 0),
    });
  });
});

describe("difficultyOption", () => {
  it("steps through each adjustment, labels its change and holds to the end", () => {
    const option = difficultyOption({
      ...sampleBacktest,
      bitcoin: {
        ...sampleBacktest.bitcoin,
        difficulty_adjustments: [
          {
            start_utc: "2026-06-01T05:00:00Z",
            difficulty: "125000000000000",
            change_ratio: null,
          },
          {
            start_utc: "2026-06-01T05:30:00Z",
            difficulty: "133937500000000",
            change_ratio: "0.0715",
          },
        ],
      },
    });
    const series = firstSeries(option);

    expect(series).toMatchObject({ step: "end" });
    expect(series?.data).toEqual([
      {
        value: [Date.UTC(2026, 5, 1, 0, 0), 125000000000000],
        symbol: "none",
        label: { show: false },
      },
      {
        value: [Date.UTC(2026, 5, 1, 0, 30), 133937500000000],
        symbol: "circle",
        label: {
          show: true,
          position: "top",
          color: "#3FB97A",
          textBorderColor: "#111418",
          textBorderWidth: 3,
          formatter: "+7.2%",
        },
      },
      {
        value: [Date.UTC(2026, 5, 1, 1, 0), 133937500000000],
        label: { show: false },
        symbol: "none",
      },
    ]);
  });
});

describe("adjustmentTooltip", () => {
  it("gives an adjustment's change, which a narrow chart may hide", () => {
    expect(
      adjustmentTooltip({
        start_utc: "2026-06-14T00:30:00Z",
        difficulty: "124932866006548",
        change_ratio: "-0.1009",
      }),
    ).toBe("124.9 T (−10.1%)<br/>since Jun 13, 2026, 19:30 CT");
  });

  it("gives no change for the difficulty in effect at the start", () => {
    expect(
      adjustmentTooltip({
        start_utc: "2026-06-01T05:00:00Z",
        difficulty: "138955357012247",
        change_ratio: null,
      }),
    ).toBe("139.0 T<br/>since Jun 1, 2026, 00:00 CT");
  });
});

describe("small chart zoom", () => {
  it("keeps points outside the zoom window so lines reach both edges", () => {
    expect(difficultyOption(sampleBacktest).dataZoom).toMatchObject([
      { type: "inside", filterMode: "none" },
    ]);
  });
});

describe("adjustmentAt", () => {
  const adjustments = [
    {
      start_utc: "2026-06-01T05:00:00Z",
      difficulty: "125000000000000",
      change_ratio: null,
    },
    {
      start_utc: "2026-06-14T00:30:00Z",
      difficulty: "133937500000000",
      change_ratio: "0.0715",
    },
  ];

  it("finds the difficulty in effect at a moment, not the nearest change", () => {
    expect(
      adjustmentAt(adjustments, Date.UTC(2026, 5, 13, 19, 0))?.difficulty,
    ).toBe("125000000000000");
    expect(
      adjustmentAt(adjustments, Date.UTC(2026, 5, 13, 19, 30))?.difficulty,
    ).toBe("133937500000000");
  });

  it("finds nothing before the first adjustment", () => {
    expect(adjustmentAt(adjustments, Date.UTC(2026, 4, 31))).toBeUndefined();
  });
});

describe("small chart pointer", () => {
  it("sits at the hovered time rather than snapping to a data point", () => {
    expect(difficultyOption(sampleBacktest).xAxis).toMatchObject({
      axisPointer: { snap: false },
    });
  });
});
