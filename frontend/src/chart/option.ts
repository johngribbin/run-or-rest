import type { LineSeriesOption } from "echarts/charts";
import type {
  DataZoomComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";
import type { Backtest, SeriesPoint, StrategyId } from "../api/backtest.ts";
import {
  CHART_COLORS,
  CHART_SERIES_NAMES,
  CHART_TIME_AXIS_NAME,
} from "../config.ts";
import { formatDecimal, formatPrice } from "../format.ts";
import { chartTime, formatCentralTime } from "./time.ts";

export type ChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>;

export interface OffBand {
  start: string;
  end: string;
}

export function intervalMs(backtest: Backtest): number {
  const span =
    Date.parse(backtest.period.end_utc) - Date.parse(backtest.period.start_utc);
  return span / backtest.data_quality.expected_intervals;
}

function utc(ms: number): string {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

export function offBands(
  series: readonly SeriesPoint[],
  strategy: StrategyId,
  interval: number,
): OffBand[] {
  const bands: OffBand[] = [];
  let start: string | null = null;
  series.forEach((point, index) => {
    if (point.decisions[strategy] !== "off") {
      return;
    }
    start ??= point.interval_start_utc;
    const end = Date.parse(point.interval_start_utc) + interval;
    const next = series[index + 1];
    const continues =
      next !== undefined &&
      next.decisions[strategy] === "off" &&
      Date.parse(next.interval_start_utc) === end;
    if (!continues) {
      bands.push({ start, end: utc(end) });
      start = null;
    }
  });
  return bands;
}

export function priceTick(value: number): string {
  return formatDecimal(String(value));
}

export function tooltipText(point: SeriesPoint): string {
  return [
    formatCentralTime(point.interval_start_utc),
    `${CHART_SERIES_NAMES.price}: ${formatPrice(point.price_usd_per_mwh)}`,
    `${CHART_SERIES_NAMES.breakeven}: ${formatPrice(point.breakeven_estimate_usd_per_mwh)}`,
  ].join("<br/>");
}

function line(
  name: string,
  color: string,
  data: [number, number][],
): LineSeriesOption {
  return {
    name,
    type: "line",
    showSymbol: false,
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
    CHART_SERIES_NAMES.price,
    CHART_COLORS.price,
    backtest.series.map((point) => [
      chartTime(point.interval_start_utc),
      Number(point.price_usd_per_mwh),
    ]),
  );
  const breakeven = line(
    CHART_SERIES_NAMES.breakeven,
    CHART_COLORS.breakeven,
    backtest.series.map((point) => [
      chartTime(point.interval_start_utc),
      Number(point.breakeven_estimate_usd_per_mwh),
    ]),
  );
  price.markArea = {
    silent: true,
    itemStyle: { color: CHART_COLORS.offBand },
    data: offBands(backtest.series, strategy, intervalMs(backtest)).map(
      (band) => [
        { xAxis: chartTime(band.start) },
        { xAxis: chartTime(band.end) },
      ],
    ),
  };
  price.markLine = {
    silent: true,
    symbol: "none",
    lineStyle: { color: CHART_COLORS.peak, type: "dashed" },
    label: { formatter: "{b}" },
    data: backtest.fourcp_peaks.map((peak) => ({
      name: `4CP ${peak.month}: ${formatDecimal(peak.system_load_mw)} MW`,
      xAxis: chartTime(peak.interval_start_utc),
    })),
  };
  return {
    animation: false,
    useUTC: true,
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        const point = backtest.series[first?.dataIndex ?? -1];
        return point === undefined ? "" : tooltipText(point);
      },
    },
    grid: { left: 56, right: 24, top: 24, bottom: 72 },
    xAxis: { type: "time", name: CHART_TIME_AXIS_NAME },
    yAxis: {
      type: "value",
      name: "$/MWh",
      axisLabel: { formatter: priceTick },
    },
    dataZoom: [{ type: "inside" }, { type: "slider" }],
    series: [price, breakeven],
  };
}
