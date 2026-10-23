import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import {
  BASELINE_STRATEGY_ID,
  type Backtest,
  type Strategy,
} from "../api/backtest.ts";
import {
  BASELINE_DELTA,
  BEST_BADGE,
  KPI_LABELS,
  STRATEGIES_HEADING,
  STRATEGY_DESCRIPTIONS,
  GAIN_LABELS,
  TOOLTIPS,
} from "../config.ts";
import {
  formatBtc,
  formatHoursSummary,
  formatInteger,
  formatSignedUsdWhole,
  formatUsdWhole,
} from "../format.ts";
import { Term } from "./Term.tsx";
import { Eyebrow } from "./ui.tsx";

function Delta({ strategy }: { strategy: Strategy }) {
  if (strategy.id === BASELINE_STRATEGY_ID) {
    return <Text c="dimmed">{BASELINE_DELTA}</Text>;
  }
  const gain = strategy.gain_vs_always_on;
  return (
    <>
      <Text
        c={
          gain.total_usd.startsWith("-") ? "var(--ror-bad)" : "var(--ror-good)"
        }
      >
        {formatSignedUsdWhole(gain.total_usd)} vs. always on
      </Text>
      <Text size="xs" c="dimmed">
        <Term tooltip={TOOLTIPS.priceGain}>{GAIN_LABELS.price}</Term>{" "}
        {formatSignedUsdWhole(gain.price_usd)} ·{" "}
        <Term tooltip={TOOLTIPS.fourcpGain}>{GAIN_LABELS.fourcp}</Term>{" "}
        {formatSignedUsdWhole(gain.fourcp_usd)}
      </Text>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0}>
      <Eyebrow>{label}</Eyebrow>
      <Text fw={500}>{value}</Text>
    </Stack>
  );
}

function StrategyCard({
  strategy,
  best,
  peaks,
}: {
  strategy: Strategy;
  best: boolean;
  peaks: number;
}) {
  return (
    <Paper
      component="article"
      aria-label={strategy.label}
      withBorder
      p="lg"
      bg="var(--ror-surface)"
      style={{ borderColor: best ? "var(--ror-accent)" : "var(--ror-line)" }}
    >
      <Stack gap="md" h="100%">
        <Group justify="space-between" gap="xs">
          <Title order={3}>{strategy.label}</Title>
          {best ? (
            <Badge
              variant="light"
              color="var(--ror-accent)"
              bg="var(--ror-accent-soft)"
              c="var(--ror-accent)"
              tt="none"
              radius="xl"
            >
              {BEST_BADGE}
            </Badge>
          ) : null}
        </Group>
        <Text c="var(--ror-text-secondary)" style={{ flexGrow: 1 }}>
          {STRATEGY_DESCRIPTIONS[strategy.id]}
        </Text>
        <Stack gap={0}>
          <Eyebrow>{KPI_LABELS.netProfit}</Eyebrow>
          <Text size="xl" fw={600} lh={1.25}>
            {formatUsdWhole(strategy.net_profit_usd)}
          </Text>
          <Delta strategy={strategy} />
        </Stack>
        <SimpleGrid
          cols={3}
          spacing="sm"
          pt="md"
          style={{ borderTop: "1px solid var(--ror-line)", alignItems: "end" }}
        >
          <Stat
            label={KPI_LABELS.hoursOff}
            value={formatHoursSummary(strategy.hours_off)}
          />
          <Stat
            label={KPI_LABELS.btcMined}
            value={formatBtc(strategy.mined_sats)}
          />
          <Stat
            label={KPI_LABELS.peaksRunIn}
            value={`${formatInteger(strategy.peaks_running)} of ${formatInteger(peaks)}`}
          />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

export function StrategyCards({ backtest }: { backtest: Backtest }) {
  return (
    <section aria-labelledby="strategies-heading">
      <VisuallyHidden component="h2" id="strategies-heading">
        {STRATEGIES_HEADING}
      </VisuallyHidden>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {backtest.strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            best={strategy.id === backtest.winner.id}
            peaks={backtest.fourcp.peaks.length}
          />
        ))}
      </SimpleGrid>
    </section>
  );
}
