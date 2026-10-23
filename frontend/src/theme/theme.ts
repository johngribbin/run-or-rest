import { type CSSVariablesResolver, createTheme, rem } from "@mantine/core";
import {
  COLOR_TOKENS,
  type ColorTokens,
  FONT_FAMILY,
  FONT_SIZES_PX,
  RADIUS_PX,
} from "../config.ts";

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

function tokenVariables(tokens: ColorTokens): Record<string, string> {
  return {
    "--mantine-color-body": tokens.background,
    "--mantine-color-text": tokens.text,
    "--mantine-color-dimmed": tokens.textMuted,
    "--mantine-color-default-border": tokens.line,
    "--ror-background": tokens.background,
    "--ror-surface": tokens.surface,
    "--ror-surface-raised": tokens.surfaceRaised,
    "--ror-line": tokens.line,
    "--ror-text": tokens.text,
    "--ror-text-secondary": tokens.textSecondary,
    "--ror-text-muted": tokens.textMuted,
    "--ror-accent": tokens.accent,
    "--ror-accent-soft": tokens.accentSoft,
    "--ror-good": tokens.good,
    "--ror-bad": tokens.bad,
    "--ror-price": tokens.price,
    "--ror-peak": tokens.peak,
    "--ror-lane": tokens.lane,
  };
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--ror-font-size-hero": rem(FONT_SIZES_PX.hero),
  },
  light: tokenVariables(COLOR_TOKENS.light),
  dark: tokenVariables(COLOR_TOKENS.dark),
});
