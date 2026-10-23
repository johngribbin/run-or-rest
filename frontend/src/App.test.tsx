import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "./test/renderApp.tsx";
import { sampleBacktest } from "./test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("shows only a spinner while the first backtest loads", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    renderApp();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Running the backtest…",
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the title and subtitle once the backtest loads", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Run or Rest" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ERCOT curtailment backtest for bitcoin miners"),
    ).toBeInTheDocument();
  });

  it("names the period, settlement point and fleet of the run", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    const chips = await screen.findByRole("list", { name: "This run" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((chip) => chip.textContent),
    ).toEqual(["Jun 1, 2026", "LZ_WEST", "1 MW · 15 J/TH · 2% pool fee"]);
  });

  it("always uses the dark scheme, with no theme toggle", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    renderApp();

    expect(document.documentElement).toHaveAttribute(
      "data-mantine-color-scheme",
      "dark",
    );
    expect(
      screen.queryByRole("button", { name: /theme/ }),
    ).not.toBeInTheDocument();
  });

  it("shows formatted totals and highlights the winner", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    const table = await screen.findByRole("table", {
      name: "Results by strategy",
    });
    const winnerRow = within(table)
      .getAllByRole("row")
      .find((row) => row.getAttribute("aria-current") === "true");
    expect(
      within(winnerRow ?? table)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual([
      "Strike + peak guardBest",
      "$150,000.00",
      "$88,765.44",
      "$0.00",
      "$61,234.56",
      "−$48,765.44",
      "$50,000.00",
      "2.2500",
      "421.50",
    ]);
  });

  it("shows a dash for always on's gains over itself", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const table = await screen.findByRole("table", {
      name: "Results by strategy",
    });
    const baseline = within(table).getByRole("row", { name: /^Always on/ });

    expect(
      within(baseline)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual([
      "Always on",
      "$200,000.00",
      "$90,000.00",
      "$50,000.00",
      "$60,000.00",
      "—",
      "—",
      "3.0000",
      "0.00",
    ]);
  });

  it("says how many intervals were skipped for missing data", async () => {
    respondWith(200, {
      ...sampleBacktest,
      data_quality: { expected_intervals: 11712, missing_intervals: 5 },
    });

    renderApp();

    expect(await screen.findByText(/intervals priced/)).toHaveTextContent(
      "11,707 of 11,712 intervals priced · 5 skipped for missing data",
    );
  });

  it("keeps the assumptions collapsed until asked", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const toggle = await screen.findByRole("button", {
      name: "Model and assumptions",
    });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("row", { name: "Efficiency 15 J/TH" }),
    ).not.toBeInTheDocument();
  });

  it("lists the assumptions and the data attributions", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();

    renderApp();
    await user.click(
      await screen.findByRole("button", { name: "Model and assumptions" }),
    );

    expect(
      await screen.findByRole("row", { name: "Efficiency 15 J/TH" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$50,000.00 per MW-year")).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "Pool fee rate 2%" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "Peak guard trigger 95%" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Jun 1, 2026, 00:00 CT to Jun 1, 2026, 01:00 CT"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The fleet switches fully on or off instantly/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Data provided by Grid Status" }),
    ).toHaveAttribute("href", "https://www.gridstatus.io/");
    expect(screen.getByRole("link", { name: "CC BY-NC 4.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-nc/4.0/",
    );
  });

  it("shows the API's detail when the backtest fails", async () => {
    respondWith(503, {
      detail:
        "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set.",
    });

    renderApp();

    expect(
      await screen.findByText(
        "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set.",
      ),
    ).toBeInTheDocument();
  });

  it("refetches with the new threshold after the slider settles", async () => {
    const fetchStub = respondWith(200, sampleBacktest);
    const user = userEvent.setup();
    renderApp();

    const slider = await screen.findByRole("slider");
    await user.click(slider);
    await user.keyboard("{ArrowRight}");

    expect(screen.getByTestId("threshold-value")).toHaveTextContent("96%");
    expect(fetchStub).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(fetchStub).toHaveBeenLastCalledWith(
        "/api/backtest?peak_guard_threshold=0.96",
        expect.anything(),
      );
    });
  });

  it("lists every rule's switched-off hours under the chart", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const lanes = await screen.findByRole("list", {
      name: "When each rule was switched off",
    });

    expect(
      within(lanes)
        .getAllByRole("listitem")
        .map((lane) => lane.getAttribute("aria-label")),
    ).toEqual([
      "Always on: 0.0 h",
      "Strike price: 12.2 h",
      "Strike + peak guard: 421.5 h",
    ]);
  });

  it("offers the whole season and each month as chart ranges", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();

    renderApp();
    const season = await screen.findByRole("radio", { name: "Season" });
    const june = screen.getByRole("radio", { name: "Jun" });
    expect(season).toBeChecked();
    await user.click(june);

    expect(june).toBeChecked();
    expect(season).not.toBeChecked();
  });

  it("shows the status when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("", {
            status: 502,
            headers: { "Content-Type": "text/plain" },
          }),
        ),
      ),
    );

    renderApp();

    expect(
      await screen.findByText("Request failed with status 502"),
    ).toBeInTheDocument();
  });

  it("marks the results as updating while a new threshold loads", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(sampleBacktest), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockReturnValue(new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchStub);
    const user = userEvent.setup();
    renderApp();

    const slider = await screen.findByRole("slider");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(slider);
    await user.keyboard("{ArrowRight}");

    expect(
      await screen.findByRole("status", {}, { timeout: 2000 }),
    ).toHaveTextContent("Updating…");
    expect(
      screen
        .getByRole("table", { name: "Results by strategy" })
        .closest("[aria-busy='true']"),
    ).not.toBeNull();
  });
});

describe("Peak guard trigger", () => {
  it("gives the control and the strategy cards their own headings", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    await screen.findByRole("region", { name: "Peak guard trigger" });

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      "Which rule made the most money this summer?",
      "4CP: four 15-minute windows that set a year of transmission cost",
      "Peak guard trigger",
      "All three rules",
      "Power price vs. mining breakeven",
      "This summer's 4CP peaks",
      "What sets the breakeven line",
      "Full breakdown",
    ]);
  });

  it("explains the control and labels both ends of its range", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const control = await screen.findByRole("region", {
      name: "Peak guard trigger",
    });

    expect(within(control).getByRole("slider")).toHaveAccessibleDescription(
      "Switch off when ERCOT demand reaches this share of the month's peak so far.",
    );
    expect(
      within(control).getByText("80% · off more often"),
    ).toBeInTheDocument();
    expect(within(control).getByText("100% · off less")).toBeInTheDocument();
  });
});
