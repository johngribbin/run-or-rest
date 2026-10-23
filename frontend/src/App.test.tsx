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

  it("says how many intervals were skipped, under the assumptions", async () => {
    respondWith(200, {
      ...sampleBacktest,
      data_quality: { expected_intervals: 11712, missing_intervals: 5 },
    });
    const user = userEvent.setup();

    renderApp();
    await user.click(
      await screen.findByRole("button", { name: "Model and assumptions" }),
    );

    expect(
      screen.getByRole("row", {
        name: "Intervals priced 11,707 of 11,712 (5 skipped for missing data)",
      }),
    ).toBeInTheDocument();
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

  it("shades the winner's off periods and lets you pick the other rule", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();

    renderApp();
    const picker = await screen.findByRole("radiogroup", {
      name: "Show when the miners were off under",
    });
    const radios = within(picker).getAllByRole("radio");

    expect(radios.map((radio) => radio.getAttribute("value"))).toEqual([
      "strike_price",
      "strike_peak_guard",
    ]);
    expect(
      within(picker).getByRole("radio", { name: "Strike + peak guard" }),
    ).toBeChecked();
    await user.click(
      within(picker).getByRole("radio", { name: "Strike price" }),
    );
    expect(
      within(picker).getByRole("radio", { name: "Strike price" }),
    ).toBeChecked();
  });

  it("shades the first curtailing rule when always on wins", async () => {
    respondWith(200, {
      ...sampleBacktest,
      winner: { id: "always_on", advantage_over_always_on_usd: "0.00" },
    });

    renderApp();
    const picker = await screen.findByRole("radiogroup", {
      name: "Show when the miners were off under",
    });

    expect(
      within(picker).getByRole("radio", { name: "Strike price" }),
    ).toBeChecked();
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
        .getByRole("article", { name: "Strike price" })
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
      "What sets the breakeven line",
    ]);
  });

  it("explains the control and labels both ends of its range", async () => {
    respondWith(200, sampleBacktest);

    renderApp();
    const control = await screen.findByRole("region", {
      name: "Peak guard trigger",
    });

    expect(within(control).getByRole("slider")).toHaveAccessibleDescription(
      "Switch off when ERCOT demand reaches 95% of the month's peak so far.",
    );
    expect(within(control).getByText("80% · off more")).toBeInTheDocument();
    expect(within(control).getByText("100% · off less")).toBeInTheDocument();
  });

  it("names the chosen percentage in its explanation as the slider moves", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();

    renderApp();
    const slider = await screen.findByRole("slider");
    await user.click(slider);
    await user.keyboard("{ArrowRight}");

    expect(slider).toHaveAccessibleDescription(
      "Switch off when ERCOT demand reaches 96% of the month's peak so far.",
    );
  });
});
