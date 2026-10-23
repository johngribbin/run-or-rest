import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "../test/renderApp.tsx";
import { sampleBacktest } from "../test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const twoDays = {
  ...sampleBacktest,
  bitcoin: {
    daily: [
      {
        date_utc: "2026-06-01",
        btc_price_usd: "71328.73",
        difficulty: "138955357012247",
        reward_per_block_sats: "315153666",
        fees_share: "0.0084",
        hashprice_usd_per_ph_day: "31.89",
      },
      {
        date_utc: "2026-10-01",
        btc_price_usd: "84777.12",
        difficulty: "132757073449488",
        reward_per_block_sats: "315300000",
        fees_share: "0.0104",
        hashprice_usd_per_ph_day: "39.73",
      },
    ],
    difficulty_adjustments: [
      {
        start_utc: "2026-06-01T05:00:00Z",
        difficulty: "138955357012247",
        change_ratio: null,
      },
      {
        start_utc: "2026-06-14T00:30:00Z",
        difficulty: "124932866006548",
        change_ratio: "-0.1009",
      },
      {
        start_utc: "2026-09-19T07:15:00Z",
        difficulty: "132757073449488",
        change_ratio: "0.0626",
      },
    ],
  },
};

describe("BitcoinInputs", () => {
  it("spells out how bitcoin inputs become the breakeven line", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const panel = await screen.findByRole("region", {
      name: "What sets the breakeven line",
    });

    expect(within(panel).getAllByRole("list")[0]).toHaveAccessibleName(
      "BTC price times Block reward divided by Difficulty equals Hashprice, divided by Efficiency (15 J/TH) equals Breakeven $/MWh",
    );
  });

  it("summarises the first and last day and counts the adjustments", async () => {
    respondWith(200, twoDays);

    renderApp();
    const panel = await screen.findByRole("region", {
      name: "What sets the breakeven line",
    });
    const tile = (name: string) => within(panel).getByRole("group", { name });

    expect(tile("BTC price")).toHaveTextContent("$71,329 → $84,777");
    expect(tile("BTC price")).toHaveTextContent("Jun 1 → Oct 1");
    expect(tile("Difficulty adjustments")).toHaveTextContent("2");
    expect(tile("Difficulty adjustments")).toHaveTextContent(
      "139.0 T → 132.8 T",
    );
    expect(tile("Hashprice")).toHaveTextContent("$31.89 → $39.73");
    expect(tile("Fees share of reward")).toHaveTextContent("0.8% → 1.0%");
  });

  it("lists every difficulty adjustment for screen readers", async () => {
    respondWith(200, twoDays);

    renderApp();
    const list = await screen.findByRole("list", {
      name: "Difficulty adjustments in this window",
    });

    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Jun 1, 2026, 00:00 CT: 139.0 T",
      "Jun 13, 2026, 19:30 CT: 124.9 T, −10.1%",
      "Sep 19, 2026, 02:15 CT: 132.8 T, +6.3%",
    ]);
  });

  it("names each chart's source", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    expect(
      await screen.findByRole("img", { name: "BTC price, USD · Coin Metrics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Network difficulty, T · own Bitcoin Core node · change at each adjustment",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Hashprice, USD per PH/s per day" }),
    ).toBeInTheDocument();
  });
});
