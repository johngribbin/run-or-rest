import { CustomChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use as registerChartModules } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { afterEach, describe, expect, it } from "vitest";
import { strategyById } from "../api/backtest.ts";
import { COLORS } from "../config.ts";
import { sampleBacktest } from "../test/sampleBacktest.ts";
import { chartOption } from "./option.ts";

registerChartModules([
  CustomChart,
  LineChart,
  GridComponent,
  DataZoomComponent,
  MarkLineComponent,
  TooltipComponent,
  SVGRenderer,
]);

const charts: HTMLDivElement[] = [];

afterEach(() => {
  charts.splice(0).forEach((element) => {
    element.remove();
  });
});

function drawnOffBands(start: number, end: number): number {
  const element = document.createElement("div");
  document.body.append(element);
  charts.push(element);
  const chart = init(element, undefined, {
    renderer: "svg",
    width: 600,
    height: 300,
  });
  chart.setOption(
    chartOption(
      sampleBacktest,
      strategyById(sampleBacktest, "strike_peak_guard"),
    ),
  );
  chart.dispatchAction({ type: "dataZoom", start, end });
  chart.getZr().refreshImmediately();
  const count = [...element.querySelectorAll("path, rect")].filter(
    (shape) =>
      shape.getAttribute("fill")?.toUpperCase() ===
      COLORS.offBand.toUpperCase(),
  ).length;
  chart.dispose();
  return count;
}

describe("price chart zoom", () => {
  it("draws both off bands across the whole period", () => {
    expect(drawnOffBands(0, 100)).toBe(2);
  });

  it("keeps an off band that is only partly inside the zoom window", () => {
    expect(drawnOffBands(25, 100)).toBe(2);
  });

  it("drops an off band that is entirely outside the zoom window", () => {
    expect(drawnOffBands(55, 100)).toBe(1);
  });
});
