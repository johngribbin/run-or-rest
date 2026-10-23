import type { LineSeriesOption } from "echarts/charts";
import type { Backtest } from "../api/backtest.ts";
import { CHART_GRID_PX, type ColorTokens } from "../config.ts";
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
const TERA = 1e12;

export function dayTime(day: Day): number {
  return chartTime(`${day.date_utc}${MIDDAY_UTC}`);
}

function tickLabel(scale: number, prefix: string, suffix: string) {
  return (value: number) =>
    `${prefix}${String(Math.round(value / scale))}${suffix}`;
}

function dataIndexOf(params: unknown): number {
  const first: unknown = Array.isArray(params) ? params.at(0) : params;
  if (typeof first !== "object" || first === null) {
    return -1;
  }
  const index: unknown = Reflect.get(first, "dataIndex");
  return typeof index === "number" ? index : -1;
}

function smallOption(
  extent: Extent,
  colors: ColorTokens,
  series: LineSeriesOption,
  tick: (value: number) => string,
  tooltip: (index: number) => string,
): ChartOption {
  return {
    animation: false,
    useUTC: true,
    grid: SMALL_GRID,
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.line,
      textStyle: { color: colors.text },
      formatter: (params) => tooltip(dataIndexOf(params)),
    },
    xAxis: {
      type: "time",
      min: extent.min,
      max: extent.max,
      axisLine: { lineStyle: { color: colors.line } },
      axisLabel: { hideOverlap: true, color: colors.textMuted },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitNumber: 2,
      axisLabel: { formatter: tick, color: colors.textMuted },
      splitLine: { lineStyle: { color: colors.line } },
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
  return (index: number) => {
    const day = daily[index];
    return day === undefined
      ? ""
      : `${formatUtcDay(day.date_utc)} (UTC)<br/>${value(day)}`;
  };
}

export function btcPriceOption(
  backtest: Backtest,
  colors: ColorTokens,
): ChartOption {
  const daily = backtest.bitcoin.daily;
  return smallOption(
    chartExtent(backtest),
    colors,
    dailyLine(daily, colors.accent, (day) => day.btc_price_usd),
    tickLabel(THOUSAND, "$", "k"),
    dayTooltip(daily, (day) => formatUsdWhole(day.btc_price_usd)),
  );
}

export function hashpriceOption(
  backtest: Backtest,
  colors: ColorTokens,
): ChartOption {
  const daily = backtest.bitcoin.daily;
  return smallOption(
    chartExtent(backtest),
    colors,
    dailyLine(daily, colors.text, (day) => day.hashprice_usd_per_ph_day),
    tickLabel(1, "$", ""),
    dayTooltip(daily, (day) => formatHashprice(day.hashprice_usd_per_ph_day)),
  );
}

function adjustmentPoint(adjustment: Adjustment, colors: ColorTokens) {
  const ratio = adjustment.change_ratio;
  return {
    value: [chartTime(adjustment.start_utc), Number(adjustment.difficulty)],
    symbol: ratio === null ? "none" : "circle",
    label:
      ratio === null
        ? { show: false }
        : {
            show: true,
            position: "top" as const,
            color: ratio.startsWith("-") ? colors.bad : colors.good,
            formatter: formatSignedRatioPercent(ratio),
          },
  };
}

export function difficultyOption(
  backtest: Backtest,
  colors: ColorTokens,
): ChartOption {
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
    colors,
    {
      type: "line",
      step: "end",
      showSymbol: true,
      symbolSize: 5,
      lineStyle: { width: 2, color: colors.text },
      itemStyle: { color: colors.text },
      data: [
        ...adjustments.map((adjustment) => adjustmentPoint(adjustment, colors)),
        ...hold,
      ],
    },
    tickLabel(TERA, "", " T"),
    (index) => {
      const adjustment = adjustments[index] ?? last;
      return adjustment === undefined
        ? ""
        : `${formatCentralTime(adjustment.start_utc)}<br/>${formatDifficulty(adjustment.difficulty)}`;
    },
  );
}
