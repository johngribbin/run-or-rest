import { act, screen, waitFor, within } from "@testing-library/react";
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

const strikeWins = {
  ...sampleBacktest,
  winner: { id: "strike_price", advantage_over_always_on_usd: "1000.00" },
};

function winnerChangesWithThreshold(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(input).includes("peak_guard_threshold")
              ? strikeWins
              : sampleBacktest,
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ),
  );
}

async function moveThresholdUntilStrikePriceWins(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const slider = screen.getByRole("slider");
  await user.click(slider);
  await user.keyboard("{ArrowLeft}");
  await waitFor(() => {
    expect(
      within(screen.getByRole("article", { name: "Strike price" })).getByText(
        "Best",
      ),
    ).toBeInTheDocument();
  });
}

describe("price chart strategy toggle", () => {
  it("follows the winner when the threshold changes and no rule was picked", async () => {
    winnerChangesWithThreshold();
    const user = userEvent.setup();

    renderApp();
    const picker = await screen.findByRole("radiogroup", { name: "Strategy" });
    expect(
      within(picker).getByRole("radio", { name: "Strike + peak guard" }),
    ).toBeChecked();
    await moveThresholdUntilStrikePriceWins(user);

    expect(
      within(picker).getByRole("radio", { name: "Strike price" }),
    ).toBeChecked();
  });

  it("keeps a rule picked by hand when the winner changes", async () => {
    winnerChangesWithThreshold();
    const user = userEvent.setup();

    renderApp();
    const picker = await screen.findByRole("radiogroup", { name: "Strategy" });
    await user.click(
      within(picker).getByRole("radio", { name: "Strike price" }),
    );
    await user.click(
      within(picker).getByRole("radio", { name: "Strike + peak guard" }),
    );
    await moveThresholdUntilStrikePriceWins(user);

    expect(
      within(picker).getByRole("radio", { name: "Strike + peak guard" }),
    ).toBeChecked();
  });
});
