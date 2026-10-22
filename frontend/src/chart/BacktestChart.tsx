import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import {
  type EChartsType,
  init,
  use as registerChartModules,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { CHART_HEIGHT_PX } from "../config.ts";
import type { ChartOption } from "./option.ts";

registerChartModules([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  SVGRenderer,
]);

export function BacktestChart({ option }: { option: ChartOption }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);

  useEffect(() => {
    const element = container.current;
    if (element === null) {
      return undefined;
    }
    const instance = init(element, undefined, { renderer: "svg" });
    chart.current = instance;
    const observer = new ResizeObserver(() => {
      instance.resize();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={container}
      role="img"
      aria-label="Price and breakeven estimate over time"
      style={{ height: CHART_HEIGHT_PX, width: "100%" }}
    />
  );
}
