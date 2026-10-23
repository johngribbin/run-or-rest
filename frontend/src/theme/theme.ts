import { type CSSVariablesResolver, createTheme, rem } from "@mantine/core";
import { COLORS, FONT_FAMILY, FONT_SIZES_PX, RADIUS_PX } from "../config.ts";

export const theme = createTheme({
  fontFamily: FONT_FAMILY,
  fontSizes: {
    xs: rem(FONT_SIZES_PX.label),
    sm: rem(FONT_SIZES_PX.body),
    md: rem(FONT_SIZES_PX.body),
    lg: rem(FONT_SIZES_PX.title),
    xl: rem(FONT_SIZES_PX.kpi),
  },
  headings: {
    fontFamily: FONT_FAMILY,
    fontWeight: "600",
    sizes: {
      h1: { fontSize: rem(FONT_SIZES_PX.title), lineHeight: "1.3" },
      h2: { fontSize: rem(FONT_SIZES_PX.kpi), lineHeight: "1.25" },
      h3: { fontSize: rem(FONT_SIZES_PX.title), lineHeight: "1.3" },
    },
  },
  primaryColor: "orange",
  defaultRadius: rem(RADIUS_PX),
});

const colorVariables: Record<string, string> = {
  "--mantine-color-body": COLORS.background,
  "--mantine-color-text": COLORS.text,
  "--mantine-color-dimmed": COLORS.textMuted,
  "--mantine-color-default-border": COLORS.line,
  "--ror-background": COLORS.background,
  "--ror-surface": COLORS.surface,
  "--ror-surface-raised": COLORS.surfaceRaised,
  "--ror-line": COLORS.line,
  "--ror-text": COLORS.text,
  "--ror-text-secondary": COLORS.textSecondary,
  "--ror-text-muted": COLORS.textMuted,
  "--ror-accent": COLORS.accent,
  "--ror-accent-soft": COLORS.accentSoft,
  "--ror-good": COLORS.good,
  "--ror-bad": COLORS.bad,
  "--ror-price": COLORS.price,
  "--ror-peak": COLORS.peak,
  "--ror-lane": COLORS.lane,
  "--ror-off-band": COLORS.offBand,
};

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--ror-font-size-hero": rem(FONT_SIZES_PX.hero),
  },
  light: {},
  dark: colorVariables,
});
