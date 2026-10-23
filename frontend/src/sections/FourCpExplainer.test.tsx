import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "../test/renderApp.tsx";
import { sampleBacktest } from "../test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const HEADING =
  "4CP: four 15-minute windows that set a year of transmission cost";

describe("FourCpExplainer", () => {
  it("explains 4CP with the fleet's charge per peak", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const panel = await screen.findByRole("region", { name: HEADING });

    expect(within(panel).getByText("New to ERCOT?")).toBeInTheDocument();
    expect(
      within(panel).getByText(/^Every peak you run through costs this fleet/),
    ).toHaveTextContent(
      "Every peak you run through costs this fleet $50,000. Nobody knows the exact peak in advance, so the peak guard powers down whenever demand gets close to the month's high.",
    );
  });

  it("shows each peak's Central time, load, price and every rule's charge", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const tile = await screen.findByRole("listitem", { name: "June" });

    expect(within(tile).getByText("Mon, Jun 1, 00:15 CT")).toBeInTheDocument();
    expect(within(tile).getByText("82,712.7 MW")).toBeInTheDocument();
    expect(within(tile).getByText("$500.00/MWh")).toBeInTheDocument();
    expect(
      ["Always on", "Strike price", "Strike + peak guard"].map(
        (rule) => within(tile).getByText(rule).nextSibling?.textContent,
      ),
    ).toEqual(["Running · $50,000", "Running · $50,000", "Off · $0"]);
  });

  it("gives the lowest and highest price across the peaks", async () => {
    const [june] = sampleBacktest.fourcp.peaks;
    if (june === undefined) {
      throw new Error("The sample needs a June peak");
    }
    respondWith(200, {
      ...sampleBacktest,
      fourcp: {
        ...sampleBacktest.fourcp,
        peaks: [
          june,
          {
            ...june,
            month: "2026-07",
            interval_start_utc: "2026-07-22T21:45:00Z",
            price_usd_per_mwh: "20.53",
          },
        ],
      },
    });

    renderApp();
    const panel = await screen.findByRole("region", { name: HEADING });

    expect(within(panel).getByText(/^Power cost/)).toHaveTextContent(
      "Power cost $20.53–$500.00/MWh at the 2 peaks. A price-only rule cannot see a peak coming.",
    );
  });
});
