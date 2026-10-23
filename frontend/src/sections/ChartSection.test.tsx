import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type EChartsType, getInstanceByDom } from "echarts/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ZoomWindow, zoomFromEvent } from "../chart/option.ts";
import { CHART_COPY } from "../config.ts";
import { renderApp, respondWith } from "../test/renderApp.tsx";
import { sampleBacktest } from "../test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function priceChart(): Promise<EChartsType> {
  const element = await screen.findByRole("img", {
    name: CHART_COPY.chartLabel,
  });
  const chart = getInstanceByDom(element);
  if (chart === undefined) {
    throw new Error("The price chart has no ECharts instance");
  }
  return chart;
}

function shownZoom(chart: EChartsType): ZoomWindow | null {
  const controls: unknown = chart.getOption().dataZoom;
  return zoomFromEvent(Array.isArray(controls) ? controls.at(0) : null);
}

function zoomByHand(chart: EChartsType, start: number, end: number): void {
  act(() => {
    chart.dispatchAction({ type: "dataZoom", start, end });
  });
}

describe("price chart ranges", () => {
  it("clears the selected range when the chart is zoomed by hand", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const chart = await priceChart();
    zoomByHand(chart, 10, 20);

    expect(screen.getByRole("radio", { name: "Season" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Jun" })).not.toBeChecked();
  });

  it("zooms back out to the season after a zoom by hand", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();

    renderApp();
    const chart = await priceChart();
    zoomByHand(chart, 10, 20);
    await user.click(screen.getByRole("radio", { name: "Season" }));

    expect(screen.getByRole("radio", { name: "Season" })).toBeChecked();
    expect(shownZoom(chart)).toEqual({ start: 0, end: 100 });
  });

  it("keeps a picked month selected once the chart has zoomed to it", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();

    renderApp();
    const chart = await priceChart();
    await user.click(screen.getByRole("radio", { name: "Jun" }));

    expect(screen.getByRole("radio", { name: "Jun" })).toBeChecked();
    expect(shownZoom(chart)).toEqual({ start: 0, end: 100 });
  });
});
