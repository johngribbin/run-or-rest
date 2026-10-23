import { Box, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { formatCentralMonth, formatPeakMoment } from "../chart/time.ts";
import { FOURCP_EXPLAINER } from "../config.ts";
import {
  formatDecimal,
  formatPrice,
  formatUsd,
  formatUsdWhole,
} from "../format.ts";
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
      style={{ borderRadius: "var(--mantine-radius-md)", alignSelf: "start" }}
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

function PeakTile({
  peak,
  backtest,
  charge,
}: {
  peak: Peak;
  backtest: Backtest;
  charge: string;
}) {
  return (
    <Box
      component="li"
      aria-label={formatCentralMonth(peak.interval_start_utc)}
      p="md"
      style={{
        border: "1px solid var(--ror-line)",
        borderRadius: "var(--mantine-radius-md)",
        listStyle: "none",
      }}
    >
      <Stack gap="sm">
        <Stack gap={0}>
          <Text fw={600} size="lg">
            {formatCentralMonth(peak.interval_start_utc)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatPeakMoment(peak.interval_start_utc)}
          </Text>
        </Stack>
        <Group gap="lg">
          <Stack gap={0}>
            <Eyebrow>{FOURCP_EXPLAINER.load}</Eyebrow>
            <Text fw={500}>{formatDecimal(peak.system_load_mw)} MW</Text>
          </Stack>
          <Stack gap={0}>
            <Eyebrow>{FOURCP_EXPLAINER.price}</Eyebrow>
            <Text fw={500}>{formatPrice(peak.price_usd_per_mwh)}</Text>
          </Stack>
        </Group>
        <Stack
          gap={4}
          pt="sm"
          style={{ borderTop: "1px solid var(--ror-line)" }}
        >
          {backtest.strategies.map((strategy) => {
            const running = peak.decisions[strategy.id] === "run";
            return (
              <Group key={strategy.id} justify="space-between" gap="xs">
                <Text size="xs" c="var(--ror-text-secondary)">
                  {strategy.label}
                </Text>
                <Text
                  size="xs"
                  c={running ? "var(--ror-bad)" : "var(--ror-good)"}
                >
                  {running
                    ? `${FOURCP_EXPLAINER.running} · ${charge}`
                    : `${FOURCP_EXPLAINER.off} · ${formatUsdWhole("0")}`}
                </Text>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

export function FourCpExplainer({ backtest }: { backtest: Backtest }) {
  const { peaks, charge_per_peak_usd: perPeak } = backtest.fourcp;
  const charge = formatUsdWhole(perPeak);
  return (
    <Panel label={FOURCP_EXPLAINER.heading}>
      <Stack gap="xl">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          <Stack gap="sm">
            <Eyebrow>{FOURCP_EXPLAINER.label}</Eyebrow>
            <Title order={2}>{FOURCP_EXPLAINER.heading}</Title>
            <Text c="var(--ror-text-secondary)">{FOURCP_EXPLAINER.intro}</Text>
            <Text c="var(--ror-text-secondary)">
              {FOURCP_EXPLAINER.chargeLead}{" "}
              <Text span inherit c="var(--ror-text)">
                {charge}
              </Text>
              . {FOURCP_EXPLAINER.chargeTail}
            </Text>
          </Stack>
          <Callout peaks={peaks} />
        </SimpleGrid>
        <SimpleGrid
          component="ul"
          cols={{ base: 1, sm: 2, lg: 4 }}
          spacing="sm"
          m={0}
          p={0}
          aria-label="4CP peaks"
        >
          {peaks.map((peak) => (
            <PeakTile
              key={peak.month}
              peak={peak}
              backtest={backtest}
              charge={charge}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Panel>
  );
}
