import { Box, Stack, Text, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { FOURCP_EXPLAINER } from "../config.ts";
import { formatPrice, formatUsd, formatUsdWhole } from "../format.ts";
import { Eyebrow, Panel } from "./ui.tsx";

type Peak = Backtest["fourcp"]["peaks"][number];

function priceRange(peaks: readonly Peak[]): string {
  const prices = peaks
    .map((peak) => peak.price_usd_per_mwh)
    .sort((left, right) => Number(left) - Number(right));
  const lowest = prices.at(0) ?? "";
  const highest = prices.at(-1) ?? "";
  return lowest === highest
    ? formatPrice(lowest)
    : `${formatUsd(lowest)}–${formatPrice(highest)}`;
}

function Callout({ peaks }: { peaks: readonly Peak[] }) {
  return (
    <Box
      bg="var(--ror-surface-raised)"
      p="lg"
      mt="xs"
      style={{ borderRadius: "var(--mantine-radius-md)" }}
    >
      <Stack gap="xs">
        <Text fw={600} size="lg">
          {FOURCP_EXPLAINER.calloutTitle}
        </Text>
        <Text c="var(--ror-text-secondary)">
          Power cost {priceRange(peaks)} at{" "}
          {peaks.length === 1
            ? "the peak"
            : `the ${String(peaks.length)} peaks`}
          . {FOURCP_EXPLAINER.calloutTail}
        </Text>
      </Stack>
    </Box>
  );
}

export function FourCpIntro({ backtest }: { backtest: Backtest }) {
  const { peaks, charge_per_peak_usd: perPeak } = backtest.fourcp;
  return (
    <Panel label={FOURCP_EXPLAINER.heading}>
      <Stack gap="sm">
        <Eyebrow>{FOURCP_EXPLAINER.label}</Eyebrow>
        <Title order={2}>{FOURCP_EXPLAINER.heading}</Title>
        <Text c="var(--ror-text-secondary)">{FOURCP_EXPLAINER.intro}</Text>
        <Text c="var(--ror-text-secondary)">
          {FOURCP_EXPLAINER.chargeLead}{" "}
          <Text span inherit c="var(--ror-text)">
            {formatUsdWhole(perPeak)}
          </Text>
          . {FOURCP_EXPLAINER.chargeTail}
        </Text>
        <Callout peaks={peaks} />
      </Stack>
    </Panel>
  );
}
