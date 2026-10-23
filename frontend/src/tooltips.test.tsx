import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "./test/renderApp.tsx";
import { sampleBacktest } from "./test/sampleBacktest.ts";

const CARD_TERMS: [string, string][] = [
  [
    "Price gain",
    "Saved by avoiding expensive power, minus mining revenue given up, compared with always on.",
  ],
  ["4CP gain", "Transmission charges avoided compared with always on."],
];

function describedBy(term: HTMLElement): HTMLElement {
  const id = term.getAttribute("aria-describedby");
  const tooltip = id === null ? null : document.getElementById(id);
  if (tooltip === null) {
    throw new Error("No tooltip is attached to this term");
  }
  expect(tooltip).toHaveAttribute("role", "tooltip");
  return tooltip;
}

async function tooltipFor(term: HTMLElement): Promise<string | null> {
  const user = userEvent.setup();
  await user.hover(term);
  const text = (await waitFor(() => describedBy(term))).textContent;
  await user.unhover(term);
  await waitFor(() => {
    expect(term).not.toHaveAttribute("aria-describedby");
  });
  return text;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tooltips", () => {
  it("explain the gain split on a strategy card", async () => {
    respondWith(200, sampleBacktest);
    renderApp();
    const card = await screen.findByRole("article", { name: "Strike price" });

    const seen: [string, string | null][] = [];
    for (const [term] of CARD_TERMS) {
      seen.push([term, await tooltipFor(within(card).getByText(term))]);
    }

    expect(seen).toEqual(CARD_TERMS);
  });
  it("explain breakeven in the chart legend", async () => {
    respondWith(200, sampleBacktest);
    renderApp();
    const legend = await screen.findByRole("list", { name: "Chart legend" });

    expect(await tooltipFor(within(legend).getByText("Breakeven"))).toBe(
      "The power price where mining just pays for itself, using yesterday’s bitcoin price and rewards.",
    );
  });

  it("explain block reward, hashprice, difficulty and efficiency in the formula", async () => {
    respondWith(200, sampleBacktest);
    renderApp();
    const panel = await screen.findByRole("region", {
      name: "What sets the breakeven line",
    });
    const [formula] = within(panel).getAllByRole("list");
    if (formula === undefined) {
      throw new Error("The panel has no formula");
    }

    expect(await tooltipFor(within(formula).getByText("Hashprice"))).toBe(
      "What 1 PH/s of hashrate earns in a day, in USD, after the pool fee.",
    );
    expect(await tooltipFor(within(formula).getByText("Difficulty"))).toBe(
      "How hard it is to find a block. It adjusts every 2,016 blocks, about every two weeks, to keep blocks near 10 minutes apart.",
    );
    expect(await tooltipFor(within(formula).getByText("Block reward"))).toBe(
      "The new bitcoin each block creates (the subsidy) plus the transaction fees paid to its miner.",
    );
    expect(await tooltipFor(within(formula).getByText("Efficiency"))).toBe(
      "Energy the fleet uses per terahash in this run: 15 J/TH. Lower is better.",
    );
  });

  it("open from the keyboard too", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();
    renderApp();
    const legend = await screen.findByRole("list", { name: "Chart legend" });
    const term = within(legend).getByText("Breakeven");

    expect(term).not.toHaveAttribute("aria-describedby");
    for (
      let presses = 0;
      presses < 50 && document.activeElement !== term;
      presses++
    ) {
      await user.tab();
    }
    expect(term).toHaveFocus();

    expect((await waitFor(() => describedBy(term))).textContent).toBe(
      "The power price where mining just pays for itself, using yesterday\u2019s bitcoin price and rewards.",
    );
  });
});
