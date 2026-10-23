import { describe, expect, it } from "vitest";
import { chartTime, formatCentralTime } from "./time.ts";

function shown(utc: string): string {
  return new Date(chartTime(utc)).toISOString();
}

describe("chartTime", () => {
  it("places a summer interval at its Central daylight time", () => {
    expect(shown("2026-07-15T21:45:00Z")).toBe("2026-07-15T16:45:00.000Z");
  });

  it("keeps an interval in its Central month near midnight", () => {
    expect(shown("2026-08-01T04:45:00Z")).toBe("2026-07-31T23:45:00.000Z");
  });

  it("places a winter interval at its Central standard time", () => {
    expect(shown("2026-12-01T18:00:00Z")).toBe("2026-12-01T12:00:00.000Z");
  });
});

describe("formatCentralTime", () => {
  it("writes an interval start in Central time", () => {
    expect(formatCentralTime("2026-07-22T21:45:00Z")).toBe(
      "Jul 22, 2026, 16:45 CT",
    );
  });

  it("writes the window start as Central midnight", () => {
    expect(formatCentralTime("2026-06-01T05:00:00Z")).toBe(
      "Jun 1, 2026, 00:00 CT",
    );
  });
});
