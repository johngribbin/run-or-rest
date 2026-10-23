import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";
import type {
  DataZoomComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";
import type {
  Backtest,
  SeriesPoint,
  Strategy,
  StrategyId,
} from "../api/backtest.ts";
import {
  CHART_COPY,
  CHART_GRID_PX,
  CHART_SERIES_NAMES,
  COLORS,
  OFF_BAND_MIN_PX,
} from "../config.ts";
import { formatDecimal, formatPrice } from "../format.ts";
import { chartTime, formatCentralTime, formatPeakDay } from "./time.ts";

export type ChartOption = ComposeOption<
  | LineSeriesOption
  | CustomSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>;

export interface OffBand {
  start: string;
  end: string;
}

export interface ZoomWindow {
  start: number;
  end: number;
}

export interface Extent {
  min: number;
  max: number;
}

export const FULL_ZOOM: ZoomWindow = { start: 0, end: 100 };

export function intervalMs(backtest: Backtest): number {
  const span =
    Date.parse(backtest.period.end_utc) - Date.parse(backtest.period.start_utc);
  return span / backtest.data_quality.expected_intervals;
}

export function chartExtent(backtest: Backtest): Extent {
  return {
    min: chartTime(backtest.period.start_utc),
    max: chartTime(backtest.period.end_utc),
  };
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

export function zoomFor(extent: Extent, range: Extent): ZoomWindow {
  const span = extent.max - extent.min;
  return {
    start: ((range.min - extent.min) / span) * 100,
    end: ((range.max - extent.min) / span) * 100,
  };
}

function numberField(value: object, key: string): number | null {
  const found: unknown = Reflect.get(value, key);
  return typeof found === "number" ? found : null;
}

export function zoomFromEvent(event: unknown): ZoomWindow | null {
  if (typeof event !== "object" || event === null) {
    return null;
  }
  const batch: unknown = Reflect.get(event, "batch");
  const first: unknown = Array.isArray(batch) ? batch.at(0) : event;
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const start = numberField(first, "start");
  const end = numberField(first, "end");
  return start === null || end === null ? null : { start, end };
}

export function priceTick(value: number): string {
  return formatDecimal(String(value));
}

export function tooltipText(point: SeriesPoint, strategy: Strategy): string {
  const state =
    point.decisions[strategy.id] === "off"
      ? CHART_COPY.off
      : CHART_COPY.running;
  return [
    formatCentralTime(point.interval_start_utc),
    `${CHART_SERIES_NAMES.price}: ${formatPrice(point.price_usd_per_mwh)}`,
    `${CHART_SERIES_NAMES.breakeven}: ${formatPrice(point.breakeven_estimate_usd_per_mwh)}`,
    `${strategy.label}: ${state}`,
  ].join("<br/>");
}

export interface PlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function bandRect(
  fromPx: number,
  toPx: number,
  plot: PlotRect,
): PlotRect | null {
  const width = Math.max(toPx - fromPx, OFF_BAND_MIN_PX);
  const left = Math.max(fromPx, plot.x);
  const right = Math.min(fromPx + width, plot.x + plot.width);
  return right <= left
    ? null
    : { x: left, y: plot.y, width: right - left, height: plot.height };
}

function plotOf(params: unknown): PlotRect | null {
  if (typeof params !== "object" || params === null) {
    return null;
  }
  const system: unknown = Reflect.get(params, "coordSys");
  if (typeof system !== "object" || system === null) {
    return null;
  }
  const [x, y, width, height] = ["x", "y", "width", "height"].map(
    (key): unknown => Reflect.get(system, key),
  );
  return typeof x === "number" &&
    typeof y === "number" &&
    typeof width === "number" &&
    typeof height === "number"
    ? { x, y, width, height }
    : null;
}

function offShading(
  backtest: Backtest,
  strategy: StrategyId,
): CustomSeriesOption {
  return {
    type: "custom",
    silent: true,
    z: 1,
    clip: true,
    tooltip: { show: false },
    encode: { x: [0, 1] },
    data: offBands(backtest.series, strategy, intervalMs(backtest)).map(
      (band) => [chartTime(band.start), chartTime(band.end)],
    ),
    renderItem: (params, api) => {
      const plot = plotOf(params);
      const from = api.coord([api.value(0), 0])[0];
      const to = api.coord([api.value(1), 0])[0];
      const rect =
        plot === null || from === undefined || to === undefined
          ? null
          : bandRect(from, to, plot);
      return rect === null
        ? null
        : { type: "rect", shape: rect, style: { fill: COLORS.offBand } };
    },
  };
}

function line(
  name: string,
  color: string,
  data: [number, number][],
  dashed: boolean,
): LineSeriesOption {
  return {
    name,
    type: "line",
    showSymbol: false,
    lineStyle: {
      width: dashed ? 1.5 : 1.25,
      color,
      type: dashed ? "dashed" : "solid",
    },
    itemStyle: { color },
    data,
  };
}

function axisColors() {
  return {
    nameTextStyle: { color: COLORS.textMuted },
    axisLine: { lineStyle: { color: COLORS.line } },
    splitLine: { lineStyle: { color: COLORS.line } },
  };
}

function peakMarkers(backtest: Backtest): LineSeriesOption["markLine"] {
  return {
    silent: true,
    symbol: "none",
    lineStyle: { color: COLORS.bad, type: "solid", width: 2 },
    label: {
      formatter: "{b}",
      position: "end",
      color: COLORS.textSecondary,
    },
    data: backtest.fourcp.peaks.map((peak) => ({
      name: `${CHART_COPY.peakMarker} · ${formatPeakDay(peak.interval_start_utc)}`,
      xAxis: chartTime(peak.interval_start_utc),
    })),
  };
}

function zoomControls(): DataZoomComponentOption[] {
  return [
    {
      type: "inside",
      filterMode: "weakFilter",
      zoomOnMouseWheel: true,
      moveOnMouseWheel: false,
      moveOnMouseMove: true,
    },
    {
      type: "slider",
      filterMode: "weakFilter",
      height: 20,
      bottom: 8,
      showDataShadow: false,
      borderColor: COLORS.textMuted,
      backgroundColor: COLORS.surfaceRaised,
      fillerColor: COLORS.zoomFill,
      textStyle: { color: COLORS.textSecondary },
      handleSize: "120%",
      handleStyle: {
        color: COLORS.textSecondary,
        borderColor: COLORS.textSecondary,
      },
      moveHandleStyle: { color: COLORS.textMuted, opacity: 0.6 },
      emphasis: {
        handleStyle: { color: COLORS.text, borderColor: COLORS.text },
        moveHandleStyle: { color: COLORS.textSecondary, opacity: 1 },
      },
    },
  ];
}

export function chartOption(
  backtest: Backtest,
  strategy: Strategy,
): ChartOption {
  const at = (point: SeriesPoint) => chartTime(point.interval_start_utc);
  const price = line(
    CHART_SERIES_NAMES.price,
    COLORS.price,
    backtest.series.map((point) => [
      at(point),
      Number(point.price_usd_per_mwh),
    ]),
    false,
  );
  const breakeven = line(
    CHART_SERIES_NAMES.breakeven,
    COLORS.text,
    backtest.series.map((point) => [
      at(point),
      Number(point.breakeven_estimate_usd_per_mwh),
    ]),
    true,
  );
  price.markLine = peakMarkers(backtest);

  const extent = chartExtent(backtest);
  return {
    animation: false,
    useUTC: true,
    tooltip: {
      trigger: "axis",
      backgroundColor: COLORS.surface,
      borderColor: COLORS.line,
      textStyle: { color: COLORS.text },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        const point = backtest.series[first?.dataIndex ?? -1];
        return point === undefined ? "" : tooltipText(point, strategy);
      },
    },
    grid: CHART_GRID_PX,
    xAxis: {
      ...axisColors(),
      type: "time",
      min: extent.min,
      max: extent.max,
      splitLine: { show: false },
      axisLabel: { hideOverlap: true, color: COLORS.textMuted },
    },
    yAxis: {
      ...axisColors(),
      type: "value",
      name: CHART_COPY.priceAxis,
      axisLabel: { formatter: priceTick, color: COLORS.textMuted },
    },
    dataZoom: zoomControls(),
    series: [price, breakeven, offShading(backtest, strategy.id)],
  };
}
