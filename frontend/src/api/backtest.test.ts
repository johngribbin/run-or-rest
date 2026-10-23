import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleBacktest } from "../test/sampleBacktest.ts";
import { backtestUrl, fetchBacktest, parseBacktest } from "./backtest.ts";

function respond(status: number, body: unknown) {
  const fetchStub = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseBacktest", () => {
  it("accepts a complete response", () => {
    expect(parseBacktest(JSON.parse(JSON.stringify(sampleBacktest)))).toEqual(
      sampleBacktest,
    );
  });

  it("rejects a number where a decimal string is expected", () => {
    const body: unknown = JSON.parse(
      JSON.stringify(sampleBacktest).replace(
        '"revenue_usd":"200000.00"',
        '"revenue_usd":200000',
      ),
    );

    expect(() => parseBacktest(body)).toThrow(
      "body.strategies[0].revenue_usd is not a string",
    );
  });

  it("rejects an unknown decision", () => {
    const body: unknown = JSON.parse(
      JSON.stringify(sampleBacktest).replace(
        '"always_on":"run"',
        '"always_on":"idle"',
      ),
    );

    expect(() => parseBacktest(body)).toThrow(
      "body.series[0].decisions.always_on is not one of run, off",
    );
  });

  it("rejects a missing section", () => {
    expect(() => parseBacktest({ ...sampleBacktest, series: null })).toThrow(
      "body.series is not a list",
    );
  });
});

describe("backtestUrl", () => {
  it("omits the threshold until one is chosen", () => {
    expect(backtestUrl(null)).toBe("/api/backtest");
  });

  it("sends the chosen threshold", () => {
    expect(backtestUrl("0.90")).toBe("/api/backtest?peak_guard_threshold=0.90");
  });
});

describe("fetchBacktest", () => {
  it("returns the parsed response", async () => {
    const fetchStub = respond(200, sampleBacktest);

    await expect(fetchBacktest("0.90")).resolves.toEqual(sampleBacktest);
    expect(fetchStub).toHaveBeenCalledWith(
      "/api/backtest?peak_guard_threshold=0.90",
      { signal: undefined },
    );
  });

  it("surfaces the detail of a 503", async () => {
    respond(503, {
      detail:
        "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set.",
    });

    await expect(fetchBacktest(null)).rejects.toThrow(
      "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set.",
    );
  });

  it("joins the messages of a 422", async () => {
    respond(422, {
      detail: [{ msg: "Input should be greater than or equal to 0.80" }],
    });

    await expect(fetchBacktest("0.79")).rejects.toThrow(
      "Input should be greater than or equal to 0.80",
    );
  });

  it("falls back to the status when there is no detail", async () => {
    respond(500, {});

    await expect(fetchBacktest(null)).rejects.toThrow(
      "Request failed with status 500",
    );
  });

  it("falls back to the status when the error body is not JSON", async () => {
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

    await expect(fetchBacktest(null)).rejects.toThrow(
      "Request failed with status 502",
    );
  });
});
