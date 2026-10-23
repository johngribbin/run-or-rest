import type { LineSeriesOption } from "echarts/charts";
import type {
  DataZoomComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";
import type { Backtest, SeriesPoint, StrategyId } from "../api/backtest.ts";
import {
  CHART_COPY,
  CHART_GRID_PX,
  CHART_SERIES_NAMES,
  COLORS,
} from "../config.ts";
import { formatDecimal, formatPrice } from "../format.ts";
import { chartTime, formatCentralTime, formatPeakDay } from "./time.ts";

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

export interface ZoomWindow {
  start: number;
  end: number;
}

export interface Extent {
  min: number;
  max: number;
}

export interface LaneRect {
  x: number;
  width: number;
}

export const FULL_ZOOM: ZoomWindow = { start: 0, end: 100 };
export const LANE_UNITS = 1000;

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

export function visibleExtent(extent: Extent, zoom: ZoomWindow): Extent {
  const span = extent.max - extent.min;
  return {
    min: extent.min + (span * zoom.start) / 100,
    max: extent.min + (span * zoom.end) / 100,
  };
}

export function zoomFor(extent: Extent, range: Extent): ZoomWindow {
  const span = extent.max - extent.min;
  return {
    start: ((range.min - extent.min) / span) * 100,
    end: ((range.max - extent.min) / span) * 100,
  };
}

export function laneRects(
  bands: readonly OffBand[],
  visible: Extent,
): LaneRect[] {
  const span = visible.max - visible.min;
  return bands.flatMap((band) => {
    const from = Math.max(chartTime(band.start), visible.min);
    const to = Math.min(chartTime(band.end), visible.max);
    if (to <= from) {
      return [];
    }
    return [
      {
        x: ((from - visible.min) / span) * LANE_UNITS,
        width: ((to - from) / span) * LANE_UNITS,
      },
    ];
  });
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
  dashed: boolean,
): LineSeriesOption {
  return {
    name,
    type: "line",
    showSymbol: false,
    lineStyle: {
      width: dashed ? 1.5 : 1,
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

function peakMarkers(backtest: Backtest) {
  return {
    silent: true,
    symbol: "none",
    lineStyle: { color: COLORS.peak, type: "solid" as const, width: 1 },
    label: {
      formatter: "{b}",
      position: "end" as const,
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
      zoomOnMouseWheel: true,
      moveOnMouseWheel: false,
      moveOnMouseMove: true,
    },
    {
      type: "slider",
      height: 20,
      bottom: 8,
      showDataShadow: false,
      borderColor: COLORS.line,
      backgroundColor: COLORS.surfaceRaised,
      fillerColor: COLORS.accentSoft,
      textStyle: { color: COLORS.textMuted },
      handleStyle: { color: COLORS.surface, borderColor: COLORS.textMuted },
      moveHandleStyle: { color: COLORS.line },
    },
  ];
}

export function chartOption(backtest: Backtest): ChartOption {
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
        return point === undefined ? "" : tooltipText(point);
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
    series: [price, breakeven],
  };
}
