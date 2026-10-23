import type { EChartsType } from "echarts/core";
import { type ZoomWindow, zoomFromEvent } from "./option.ts";

const charts = new Set<EChartsType>();
let relaying = false;

function relay(action: () => void): void {
  if (relaying) {
    return;
  }
  relaying = true;
  try {
    action();
  } finally {
    relaying = false;
  }
}

export function hoveredTime(event: unknown): number | null {
  if (typeof event !== "object" || event === null) {
    return null;
  }
  const axes: unknown = Reflect.get(event, "axesInfo");
  const first: unknown = Array.isArray(axes) ? axes.at(0) : undefined;
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const value: unknown = Reflect.get(first, "value");
  return typeof value === "number" ? value : null;
}

function others(source: EChartsType): EChartsType[] {
  return [...charts].filter((chart) => chart !== source);
}

function pointAt(chart: EChartsType, time: number): void {
  const x = chart.convertToPixel({ xAxisIndex: 0 }, time);
  if (typeof x === "number") {
    chart.dispatchAction({ type: "showTip", x, y: chart.getHeight() / 2 });
  }
}

export function joinSync(chart: EChartsType): () => void {
  charts.add(chart);
  chart.on("updateAxisPointer", (event: unknown) => {
    const time = hoveredTime(event);
    if (time !== null) {
      relay(() => {
        others(chart).forEach((other) => {
          pointAt(other, time);
        });
      });
    }
  });
  chart.on("globalout", () => {
    relay(() => {
      others(chart).forEach((other) => {
        other.dispatchAction({ type: "hideTip" });
      });
    });
  });
  chart.on("datazoom", (event: unknown) => {
    const zoom: ZoomWindow | null = zoomFromEvent(event);
    if (zoom !== null) {
      relay(() => {
        others(chart).forEach((other) => {
          other.dispatchAction({ type: "dataZoom", ...zoom });
        });
      });
    }
  });
  return () => {
    charts.delete(chart);
  };
}
