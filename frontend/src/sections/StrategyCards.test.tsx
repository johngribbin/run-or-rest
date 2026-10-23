import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "../test/renderApp.tsx";
import { sampleBacktest } from "../test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StrategyCards", () => {
  it("shows one card per rule with its description, net and change", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    await screen.findByRole("article", { name: "Always on" });

    const cards = screen.getAllByRole("article");
    expect(
      cards.map((card) => [
        card.getAttribute("aria-label"),
        within(card).getByText(/^\$[\d,]+$/).textContent,
        within(card).getByText(/^(Baseline|[+−]\$[\d,]+ vs\. always on)$/)
          .textContent,
      ]),
    ).toEqual([
      ["Always on", "$60,000", "Baseline"],
      ["Strike price", "$55,000", "−$5,000 vs. always on"],
      ["Strike + peak guard", "$61,235", "+$1,235 vs. always on"],
    ]);
    expect(
      within(cards[0] ?? document.body).getByText(
        "Never switches off. The baseline every other rule is measured against.",
      ),
    ).toBeInTheDocument();
  });

  it("marks only the winner's card as best", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    await screen.findByRole("article", { name: "Always on" });

    expect(
      screen
        .getAllByRole("article")
        .filter((card) => within(card).queryByText("Best") !== null)
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual(["Strike + peak guard"]);
  });

  it("shows hours off, BTC mined and peaks run in on each card", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const strike = await screen.findByRole("article", { name: "Strike price" });

    expect(within(strike).getByText("Hours off").nextSibling).toHaveTextContent(
      "12.2",
    );
    expect(within(strike).getByText("BTC mined").nextSibling).toHaveTextContent(
      "2.8500",
    );
    expect(
      within(strike).getByText("4CP peaks run in").nextSibling,
    ).toHaveTextContent("1 of 1");
  });

  it("splits each rule's gain into price and 4CP, but not the baseline's", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const guard = await screen.findByRole("article", {
      name: "Strike + peak guard",
    });

    expect(
      within(guard).getByText(/^Price gain/).parentElement,
    ).toHaveTextContent("Price gain −$48,765 · 4CP gain +$50,000");
    expect(
      within(screen.getByRole("article", { name: "Always on" })).queryByText(
        "Price gain",
      ),
    ).not.toBeInTheDocument();
  });

  it("asks the three-way question with the API's fleet size", async () => {
    respondWith(200, {
      ...sampleBacktest,
      assumptions: { ...sampleBacktest.assumptions, fleet_mw: "5" },
    });

    renderApp();

    expect(
      await screen.findByRole("heading", { level: 2, name: /^Three ways/ }),
    ).toHaveTextContent(
      "Three ways to run a 5 MW fleet through summer 2026. Which made the most money?",
    );
  });
});
