import type { LineSeriesOption } from "echarts/charts";
import type { Backtest } from "../api/backtest.ts";
import { CHART_GRID_PX, COLORS, DIFFICULTY_UNIT } from "../config.ts";
import {
  formatDifficulty,
  formatHashprice,
  formatSignedRatioPercent,
  formatUsdWhole,
} from "../format.ts";
import { type ChartOption, type Extent, chartExtent } from "./option.ts";
import { chartTime, formatCentralTime, formatUtcDay } from "./time.ts";

type Day = Backtest["bitcoin"]["daily"][number];
type Adjustment = Backtest["bitcoin"]["difficulty_adjustments"][number];

const SMALL_GRID = {
  left: CHART_GRID_PX.left,
  right: CHART_GRID_PX.right,
  top: 16,
  bottom: 24,
};
const MIDDAY_UTC = "T12:00:00Z";
const THOUSAND = 1000;

export function dayTime(day: Day): number {
  return chartTime(`${day.date_utc}${MIDDAY_UTC}`);
}

function tickLabel(scale: number, prefix: string, suffix: string) {
  return (value: number) =>
    `${prefix}${String(Math.round(value / scale))}${suffix}`;
}

function firstField(params: unknown, key: string): number | null {
  const first: unknown = Array.isArray(params) ? params.at(0) : params;
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const found: unknown = Reflect.get(first, key);
  return typeof found === "number" ? found : null;
}

export function adjustmentAt(
  adjustments: readonly Adjustment[],
  time: number,
): Adjustment | undefined {
  return adjustments.findLast(
    (adjustment) => chartTime(adjustment.start_utc) <= time,
  );
}

function smallOption(
  extent: Extent,
  series: LineSeriesOption,
  tick: (value: number) => string,
  tooltip: (params: unknown) => string,
): ChartOption {
  return {
    animation: false,
    useUTC: true,
    grid: SMALL_GRID,
    tooltip: {
      trigger: "axis",
      backgroundColor: COLORS.surface,
      borderColor: COLORS.line,
      textStyle: { color: COLORS.text },
      formatter: (params) => tooltip(params),
    },
    xAxis: {
      type: "time",
      axisPointer: { snap: false },
      min: extent.min,
      max: extent.max,
      axisLine: { lineStyle: { color: COLORS.line } },
      axisLabel: { hideOverlap: true, color: COLORS.textMuted },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitNumber: 2,
      axisLabel: { formatter: tick, color: COLORS.textMuted },
      splitLine: { lineStyle: { color: COLORS.line } },
    },
    dataZoom: [
      {
        type: "inside",
        filterMode: "none",
        zoomOnMouseWheel: "ctrl",
        moveOnMouseMove: false,
      },
    ],
    series: [series],
  };
}

function dailyLine(
  daily: readonly Day[],
  color: string,
  value: (day: Day) => string,
): LineSeriesOption {
  return {
    type: "line",
    showSymbol: false,
    lineStyle: { width: 2, color },
    itemStyle: { color },
    data: daily.map((day) => [dayTime(day), Number(value(day))]),
  };
}

function dayTooltip(daily: readonly Day[], value: (day: Day) => string) {
  return (params: unknown) => {
    const day = daily[firstField(params, "dataIndex") ?? -1];
    return day === undefined
      ? ""
      : `${formatUtcDay(day.date_utc)} (UTC)<br/>${value(day)}`;
  };
}

export function btcPriceOption(backtest: Backtest): ChartOption {
  const daily = backtest.bitcoin.daily;
  return smallOption(
    chartExtent(backtest),
    dailyLine(daily, COLORS.accent, (day) => day.btc_price_usd),
    tickLabel(THOUSAND, "$", "k"),
    dayTooltip(daily, (day) => formatUsdWhole(day.btc_price_usd)),
  );
}

export function hashpriceOption(backtest: Backtest): ChartOption {
  const daily = backtest.bitcoin.daily;
  return smallOption(
    chartExtent(backtest),
    dailyLine(daily, COLORS.text, (day) => day.hashprice_usd_per_ph_day),
    tickLabel(1, "$", ""),
    dayTooltip(daily, (day) => formatHashprice(day.hashprice_usd_per_ph_day)),
  );
}

type LinePoint = NonNullable<LineSeriesOption["data"]>[number];

function adjustmentPoint(adjustment: Adjustment): LinePoint {
  const ratio = adjustment.change_ratio;
  return {
    value: [chartTime(adjustment.start_utc), Number(adjustment.difficulty)],
    symbol: ratio === null ? "none" : "circle",
    label:
      ratio === null
        ? { show: false }
        : {
            show: true,
            position: "top",
            color: ratio.startsWith("-") ? COLORS.bad : COLORS.good,
            textBorderColor: COLORS.surface,
            textBorderWidth: 3,
            formatter: formatSignedRatioPercent(ratio),
          },
  };
}

export function adjustmentTooltip(adjustment: Adjustment): string {
  const ratio = adjustment.change_ratio;
  const change = ratio === null ? "" : ` (${formatSignedRatioPercent(ratio)})`;
  return `${formatDifficulty(adjustment.difficulty)}${change}<br/>since ${formatCentralTime(adjustment.start_utc)}`;
}

export function difficultyOption(backtest: Backtest): ChartOption {
  const adjustments = backtest.bitcoin.difficulty_adjustments;
  const extent = chartExtent(backtest);
  const last = adjustments.at(-1);
  const hold =
    last === undefined
      ? []
      : [
          {
            value: [extent.max, Number(last.difficulty)],
            label: { show: false },
            symbol: "none",
          },
        ];
  return smallOption(
    extent,
    {
      type: "line",
      step: "end",
      showSymbol: true,
      symbolSize: 5,
      labelLayout: { hideOverlap: true },
      lineStyle: { width: 2, color: COLORS.text },
      itemStyle: { color: COLORS.text },
      data: [
        ...adjustments.map((adjustment) => adjustmentPoint(adjustment)),
        ...hold,
      ],
    },
    tickLabel(10 ** DIFFICULTY_UNIT.power, "", ` ${DIFFICULTY_UNIT.suffix}`),
    (params) => {
      const time = firstField(params, "axisValue");
      const adjustment =
        time === null ? undefined : adjustmentAt(adjustments, time);
      return adjustment === undefined ? "" : adjustmentTooltip(adjustment);
    },
  );
}
