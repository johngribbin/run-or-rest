import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
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
import { CHART_COPY, CHART_HEIGHT_PX } from "../config.ts";
import {
  type ChartOption,
  FULL_ZOOM,
  type ZoomWindow,
  zoomFromEvent,
} from "./option.ts";

registerChartModules([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  SVGRenderer,
]);

export function BacktestChart({
  option,
  zoom,
  onZoom,
}: {
  option: ChartOption;
  zoom: ZoomWindow;
  onZoom: (zoom: ZoomWindow) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const shown = useRef<ZoomWindow>(FULL_ZOOM);
  const report = useRef(onZoom);

  useEffect(() => {
    report.current = onZoom;
  }, [onZoom]);

  useEffect(() => {
    const element = container.current;
    if (element === null) {
      return undefined;
    }
    const instance = init(element, undefined, { renderer: "svg" });
    chart.current = instance;
    instance.on("datazoom", (event: unknown) => {
      const next = zoomFromEvent(event);
      if (next !== null) {
        shown.current = next;
        report.current(next);
      }
    });
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
    const instance = chart.current;
    if (instance === null) {
      return;
    }
    instance.setOption(option, { notMerge: true });
    instance.dispatchAction({ type: "dataZoom", ...shown.current });
  }, [option]);

  useEffect(() => {
    chart.current?.dispatchAction({ type: "dataZoom", ...zoom });
  }, [zoom]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={CHART_COPY.chartLabel}
      style={{ height: CHART_HEIGHT_PX, width: "100%" }}
    />
  );
}
