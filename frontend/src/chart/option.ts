import type { LineSeriesOption } from "echarts/charts";
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";
import type { Backtest, SeriesPoint, StrategyId } from "../api/backtest.ts";
import { CHART_COLORS } from "../config.ts";

export type ChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
  | LegendComponentOption
>;

export interface OffBand {
  start: string;
  end: string;
}

export function offBands(
  series: readonly SeriesPoint[],
  strategy: StrategyId,
): OffBand[] {
  const bands: OffBand[] = [];
  let start: string | null = null;
  series.forEach((point, index) => {
    const off = point.decisions[strategy] === "off";
    if (off && start === null) {
      start = point.interval_start_utc;
    }
    const next = series[index + 1];
    const runEnds = next === undefined || next.decisions[strategy] !== "off";
    if (off && start !== null && runEnds) {
      bands.push({
        start,
        end: next?.interval_start_utc ?? point.interval_start_utc,
      });
      start = null;
    }
  });
  return bands;
}

function line(
  name: string,
  color: string,
  data: [string, number][],
): LineSeriesOption {
  return {
    name,
    type: "line",
    showSymbol: false,
    sampling: "lttb",
    lineStyle: { width: 1, color },
    itemStyle: { color },
    data,
  };
}

export function chartOption(
  backtest: Backtest,
  strategy: StrategyId,
): ChartOption {
  const price = line(
    "Price",
    CHART_COLORS.price,
    backtest.series.map((point) => [
      point.interval_start_utc,
      Number(point.price_usd_per_mwh),
    ]),
  );
  const breakeven = line(
    "Breakeven estimate",
    CHART_COLORS.breakeven,
    backtest.series.map((point) => [
      point.interval_start_utc,
      Number(point.breakeven_estimate_usd_per_mwh),
    ]),
  );
  price.markArea = {
    silent: true,
    itemStyle: { color: CHART_COLORS.offBand },
    data: offBands(backtest.series, strategy).map((band) => [
      { xAxis: band.start },
      { xAxis: band.end },
    ]),
  };
  price.markLine = {
    silent: true,
    symbol: "none",
    lineStyle: { color: CHART_COLORS.peak, type: "dashed" },
    label: { formatter: "{b}" },
    data: backtest.fourcp_peaks.map((peak) => ({
      name: `4CP ${peak.month}`,
      xAxis: peak.interval_start_utc,
    })),
  };
  return {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 56, right: 24, top: 40, bottom: 72 },
    xAxis: { type: "time" },
    yAxis: { type: "value", name: "$/MWh" },
    dataZoom: [{ type: "inside" }, { type: "slider" }],
    series: [price, breakeven],
  };
}
