import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "../test/renderApp.tsx";
import { sampleBacktest } from "../test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function answer(): Promise<HTMLElement> {
  return screen.findByRole("region", { name: "Answer" });
}

describe("Hero", () => {
  it("names the winner and its advantage over always on in whole dollars", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const panel = await answer();

    expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Which rule made the most money this summer?",
    );
    expect(within(panel).getByText("Strike + peak guard")).toBeInTheDocument();
    expect(within(panel).getByText("+$1,235")).toBeInTheDocument();
    expect(
      within(panel).getByText(
        "net profit vs. always on · 1 MW fleet at 15 J/TH",
      ),
    ).toBeInTheDocument();
  });

  it("names the fleet the dollar figures are for, from the API", async () => {
    respondWith(200, {
      ...sampleBacktest,
      assumptions: {
        ...sampleBacktest.assumptions,
        fleet_mw: "5",
        efficiency_j_per_th: "21",
      },
    });

    renderApp();

    expect(within(await answer()).getByText(/MW fleet at/)).toHaveTextContent(
      "net profit vs. always on · 5 MW fleet at 21 J/TH",
    );
  });

  it("explains the win from hours off, price gain and 4CP gain", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    expect(
      within(await answer()).getByText(/^It switched off/),
    ).toHaveTextContent(
      "It switched off for 421.5 hours, gave up $48,765 of mining margin and avoided $50,000 of next year's transmission charge.",
    );
  });

  it("says saved on power when the price gain is positive", async () => {
    const [alwaysOn, strike, guard] = sampleBacktest.strategies;
    respondWith(200, {
      ...sampleBacktest,
      winner: { id: "strike_price", advantage_over_always_on_usd: "4657.05" },
      strategies: [
        alwaysOn,
        {
          ...strike,
          hours_off: "62.25",
          gain_vs_always_on: {
            price_usd: "4657.05",
            fourcp_usd: "0.00",
            total_usd: "4657.05",
          },
        },
        guard,
      ],
    });

    renderApp();

    expect(
      within(await answer()).getByText(/^It switched off/),
    ).toHaveTextContent(
      "It switched off for 62.2 hours and saved $4,657 on power.",
    );
  });

  it("shows the winner's net profit, BTC, hours off and peaks run in", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const panel = await answer();

    const kpis: [string, string][] = [
      ["Net profit", "$61,235"],
      ["BTC mined", "2.2500"],
      ["Hours off", "421.5"],
      ["4CP peaks run in", "0 of 1"],
    ];
    for (const [label, value] of kpis) {
      expect(within(panel).getByText(label).nextSibling).toHaveTextContent(
        value,
      );
    }
  });

  it("sits the 4CP explainer beside the answer", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    await answer();

    expect(
      screen
        .getAllByRole("region")
        .slice(0, 2)
        .map((region) => region.getAttribute("aria-label")),
    ).toEqual([
      "Answer",
      "4CP: four 15-minute windows that set a year of transmission cost",
    ]);
  });

  it("says so when always on wins", async () => {
    respondWith(200, {
      ...sampleBacktest,
      winner: { id: "always_on", advantage_over_always_on_usd: "0.00" },
    });

    renderApp();

    expect(
      within(await answer()).getByText(
        "Always on made the most money; neither curtailment rule beat it. 1 MW fleet at 15 J/TH.",
      ),
    ).toBeInTheDocument();
  });
});
