import { Stack, Text, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { FOURCP_EXPLAINER } from "../config.ts";
import { formatPrice, formatUsd, formatUsdWhole } from "../format.ts";
import { Eyebrow, Panel } from "./ui.tsx";

type FourCp = Backtest["fourcp"];

function priceRange(fourcp: FourCp): string {
  const lowest = fourcp.lowest_peak_price_usd_per_mwh;
  const highest = fourcp.highest_peak_price_usd_per_mwh;
  return lowest === highest
    ? formatPrice(lowest)
    : `${formatUsd(lowest)}–${formatPrice(highest)}`;
}

function PeakPrices({ fourcp }: { fourcp: FourCp }) {
  const count = fourcp.peaks.length;
  const where = count === 1 ? "the peak" : `the ${String(count)} peaks`;
  return (
    <Text c="var(--ror-text-secondary)">
      <Text span inherit fw={600} c="var(--ror-text)">
        {FOURCP_EXPLAINER.calloutTitle}.
      </Text>{" "}
      Power cost {priceRange(fourcp)} at {where}, {FOURCP_EXPLAINER.calloutTail}
    </Text>
  );
}

export function FourCpIntro({ backtest }: { backtest: Backtest }) {
  const { fourcp } = backtest;
  const perPeak = fourcp.charge_per_peak_usd;
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
        <PeakPrices fourcp={fourcp} />
      </Stack>
    </Panel>
  );
}
