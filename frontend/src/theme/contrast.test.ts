import { describe, expect, it } from "vitest";
import { COLORS } from "../config.ts";

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * channel(hex, 1) +
    0.7152 * channel(hex, 3) +
    0.0722 * channel(hex, 5)
  );
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const SURFACES = {
  background: COLORS.background,
  surface: COLORS.surface,
  surfaceRaised: COLORS.surfaceRaised,
};

describe("colour contrast (WCAG 2.1 AA)", () => {
  it("measures black on white as 21:1", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("gives every text colour at least 4.5:1 on every surface", () => {
    const text = {
      text: COLORS.text,
      textSecondary: COLORS.textSecondary,
      textMuted: COLORS.textMuted,
      accent: COLORS.accent,
      good: COLORS.good,
      bad: COLORS.bad,
      price: COLORS.price,
    };
    const pairs = Object.entries(text).flatMap(([name, colour]) =>
      Object.entries(SURFACES).map(([surface, shade]) => ({
        pair: `${name} on ${surface}`,
        passes: contrast(colour, shade) >= 4.5,
      })),
    );

    expect(pairs).toHaveLength(21);
    expect(pairs.filter((item) => !item.passes)).toEqual([]);
  });

  it("marks off periods at least 3:1 against the chart panel", () => {
    expect(contrast(COLORS.textMuted, COLORS.surface)).toBeGreaterThanOrEqual(
      3,
    );
  });
});
