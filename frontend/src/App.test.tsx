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
      screen.getByText(
        "A transparent ERCOT curtailment backtest for bitcoin miners",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Running the backtest",
    );
  });

  it("answers the question with the winner and its advantage", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    expect(await screen.findByText(/more than always on\./)).toHaveTextContent(
      "Strike + peak guard made the most money: $1,234.56 more than always on.",
    );
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
  });

  it("lists the assumptions and the data attributions", async () => {
    respondWith(200, sampleBacktest);

    renderApp();

    expect(await screen.findByText("15 J/TH")).toBeInTheDocument();
    expect(screen.getByText("$50,000 per MW-year")).toBeInTheDocument();
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

    expect(screen.getByTestId("threshold-value")).toHaveTextContent("0.96");
    expect(fetchStub).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(fetchStub).toHaveBeenLastCalledWith(
        "/api/backtest?peak_guard_threshold=0.96",
        expect.anything(),
      );
    });
  });
});
