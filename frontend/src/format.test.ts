import { describe, expect, it } from "vitest";
import {
  formatBtc,
  formatDecimal,
  formatHours,
  formatHoursSummary,
  formatInteger,
  formatPercent,
  formatPrice,
  formatSignedUsdWhole,
  formatUsd,
  formatUsdWhole,
} from "./format.ts";

describe("formatUsd", () => {
  it.each([
    ["1234.56", "$1,234.56"],
    ["0.00", "$0.00"],
    ["999.99", "$999.99"],
    ["1234567.89", "$1,234,567.89"],
    ["-1234.56", "−$1,234.56"],
    ["50000", "$50,000.00"],
    ["0.5", "$0.50"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatUsd(value)).toBe(expected);
  });

  it("rejects a value that is not a decimal string", () => {
    expect(() => formatUsd("1,234.56")).toThrow("Not a decimal string");
  });
});

describe("formatPrice", () => {
  it("formats a price per MWh", () => {
    expect(formatPrice("12.34")).toBe("$12.34/MWh");
  });

  it("formats a negative price with a minus sign", () => {
    expect(formatPrice("-3.10")).toBe("−$3.10/MWh");
  });
});

describe("formatHours", () => {
  it("keeps the two decimals the API sends", () => {
    expect(formatHours("421.50")).toBe("421.50");
  });

  it("groups thousands", () => {
    expect(formatHours("2928.00")).toBe("2,928.00");
  });
});

describe("formatDecimal", () => {
  it("groups thousands and keeps every digit", () => {
    expect(formatDecimal("82712.7")).toBe("82,712.7");
  });

  it("writes a negative value with a minus sign", () => {
    expect(formatDecimal("-100")).toBe("−100");
  });
});

describe("formatPercent", () => {
  it.each([
    ["0.02", "2%"],
    ["0.95", "95%"],
    ["0.80", "80%"],
    ["1.00", "100%"],
    ["1", "100%"],
    ["0.955", "95.5%"],
    ["0", "0%"],
  ])("formats the share %s as %s", (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe("formatInteger", () => {
  it("adds thousands separators", () => {
    expect(formatInteger(311150000)).toBe("311,150,000");
  });

  it("leaves small values alone", () => {
    expect(formatInteger(0)).toBe("0");
  });
});

describe("formatUsdWhole", () => {
  it.each([
    ["154095.35", "$154,095"],
    ["32739.50", "$32,740"],
    ["32738.50", "$32,738"],
    ["0.49", "$0"],
    ["-17260.81", "−$17,261"],
    ["-0.40", "$0"],
    ["999.99", "$1,000"],
  ])("rounds %s half to even as %s", (value, expected) => {
    expect(formatUsdWhole(value)).toBe(expected);
  });
});

describe("formatSignedUsdWhole", () => {
  it.each([
    ["32739.19", "+$32,739"],
    ["-17260.81", "−$17,261"],
    ["0.00", "$0"],
  ])("shows the sign of %s as %s", (value, expected) => {
    expect(formatSignedUsdWhole(value)).toBe(expected);
  });
});

describe("formatBtc", () => {
  it.each([
    [334528131, "3.3453"],
    [15000, "0.0002"],
    [5000, "0.0000"],
    [100000000, "1.0000"],
    [123456789012, "1,234.5679"],
  ])("shows %i sats as %s BTC", (sats, expected) => {
    expect(formatBtc(sats)).toBe(expected);
  });
});

describe("formatHoursSummary", () => {
  it.each([
    ["421.50", "421.5"],
    ["62.25", "62.2"],
    ["62.75", "62.8"],
    ["0.00", "0.0"],
  ])("rounds %s hours half to even as %s", (value, expected) => {
    expect(formatHoursSummary(value)).toBe(expected);
  });
});
