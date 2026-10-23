import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import {
  type EChartsCoreOption,
  type EChartsType,
  connect,
  init,
  use as registerChartModules,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { CHART_GROUP } from "../config.ts";
import { FULL_ZOOM, type ZoomWindow, zoomFromEvent } from "./option.ts";

registerChartModules([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  SVGRenderer,
]);
connect(CHART_GROUP);

function ignoreZoom(): undefined {
  return undefined;
}

export function EChart({
  option,
  label,
  height,
  zoom,
  onZoom = ignoreZoom,
}: {
  option: EChartsCoreOption;
  label: string;
  height: number;
  zoom?: ZoomWindow;
  onZoom?: (zoom: ZoomWindow) => void;
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
    instance.group = CHART_GROUP;
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
    if (zoom !== undefined) {
      chart.current?.dispatchAction({ type: "dataZoom", ...zoom });
    }
  }, [zoom]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      style={{ height, width: "100%" }}
    />
  );
}
