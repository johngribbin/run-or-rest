import { describe, expect, it } from "vitest";
import {
  chartTime,
  formatCentralMonth,
  formatCentralTime,
  formatPeakMoment,
  formatPeriod,
} from "./time.ts";

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

describe("formatPeriod", () => {
  it("names the window's first and last Central days", () => {
    expect(formatPeriod("2026-06-01T05:00:00Z", "2026-10-01T05:00:00Z")).toBe(
      "Jun 1 – Sep 30, 2026",
    );
  });
});

describe("formatPeakMoment", () => {
  it("writes a peak's weekday, date and Central time", () => {
    expect(formatPeakMoment("2026-07-22T21:45:00Z")).toBe(
      "Wed, Jul 22, 16:45 CT",
    );
  });
});

describe("formatCentralMonth", () => {
  it("names the Central month of a late-evening UTC-next-day interval", () => {
    expect(formatCentralMonth("2026-08-01T04:45:00Z")).toBe("July");
  });
});
