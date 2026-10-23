import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import {
  type EChartsCoreOption,
  type EChartsType,
  init,
  use as registerChartModules,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { FULL_ZOOM, type ZoomWindow, zoomFromEvent } from "./option.ts";
import { joinSync } from "./sync.ts";

registerChartModules([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  SVGRenderer,
]);

export function EChart({
  option,
  label,
  height,
  zoom,
}: {
  option: EChartsCoreOption;
  label: string;
  height: number;
  zoom?: ZoomWindow;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const shown = useRef<ZoomWindow>(FULL_ZOOM);
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
      }
    });
    const observer = new ResizeObserver(() => {
      instance.resize();
    });
    observer.observe(element);
    const leaveSync = joinSync(instance);
    return () => {
      leaveSync();
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
