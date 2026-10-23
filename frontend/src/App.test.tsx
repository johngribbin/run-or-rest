import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, respondWith } from "./test/renderApp.tsx";
import { sampleBacktest } from "./test/sampleBacktest.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("shows the title, subtitle and a loading state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    renderApp();

    expect(
      screen.getByRole("heading", { level: 1, name: "Run or Rest" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ERCOT curtailment backtest for bitcoin miners"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Running the backtest",
    );
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

  it("starts dark and switches to the light theme", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    renderApp();

    expect(document.documentElement).toHaveAttribute(
      "data-mantine-color-scheme",
      "dark",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );
    expect(document.documentElement).toHaveAttribute(
      "data-mantine-color-scheme",
      "light",
    );
    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
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
    expect(winnerRow).toHaveTextContent("Strike + peak guard");
    expect(winnerRow).toHaveTextContent("Winner");
    expect(winnerRow).toHaveTextContent("−$48,765.44");
    expect(winnerRow).toHaveTextContent("421.50");
    expect(winnerRow).toHaveTextContent("$50,000.00");
    expect(winnerRow).toHaveTextContent("225,000,000");
  });

  it("says how many intervals were skipped for missing data", async () => {
    respondWith(200, {
      ...sampleBacktest,
      data_quality: { expected_intervals: 11712, missing_intervals: 5 },
    });

    renderApp();

    expect(
      await screen.findByText(/Intervals skipped for missing data/),
    ).toHaveTextContent("Intervals skipped for missing data: 5 of 11,712");
  });

  it("lists the assumptions and the data attributions", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    expect(await screen.findByText("15 J/TH")).toBeInTheDocument();
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

  it("switches the strategy shown on the chart", async () => {
    respondWith(200, sampleBacktest);
    const user = userEvent.setup();
    renderApp();

    const strike = await screen.findByRole("radio", { name: "Strike price" });
    expect(strike).not.toBeChecked();
    await user.click(strike);

    expect(strike).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Strike + peak guard" }),
    ).not.toBeChecked();
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
