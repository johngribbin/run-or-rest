import { describe, expect, it } from "vitest";
import { formatHours, formatPrice, formatSats, formatUsd } from "./format.ts";

describe("formatUsd", () => {
  it.each([
    ["1234.56", "$1,234.56"],
    ["0.00", "$0.00"],
    ["999.99", "$999.99"],
    ["1234567.89", "$1,234,567.89"],
    ["-1234.56", "−$1,234.56"],
    ["50000", "$50,000"],
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

describe("formatSats", () => {
  it("adds thousands separators", () => {
    expect(formatSats(311150000)).toBe("311,150,000");
  });

  it("leaves small values alone", () => {
    expect(formatSats(0)).toBe("0");
  });
});
