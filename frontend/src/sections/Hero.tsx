import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
  BASELINE_STRATEGY_ID,
  type Backtest,
  type Strategy,
  strategyById,
} from "../api/backtest.ts";
import { ANSWER_LABEL, KPI_LABELS } from "../config.ts";
import {
  formatBtc,
  formatHoursSummary,
  formatInteger,
  formatSignedUsdWhole,
  formatUsdWhole,
} from "../format.ts";
import { GainBridge } from "./GainBridge.tsx";
import { Eyebrow, Kpi, Panel } from "./ui.tsx";

function isNegative(value: string): boolean {
  return value.startsWith("-");
}

function isZero(value: string): boolean {
  return /^-?0*(\.0*)?$/.test(value);
}

function joinedClauses(clauses: readonly string[]): string {
  const last = clauses.at(-1) ?? "";
  return clauses.length < 2
    ? last
    : `${clauses.slice(0, -1).join(", ")} and ${last}`;
}

export function winnerSentence(winner: Strategy): string {
  const { price_usd: price, fourcp_usd: fourcp } = winner.gain_vs_always_on;
  const clauses = [
    `switched off for ${formatHoursSummary(winner.hours_off)} hours`,
  ];
  if (isNegative(price)) {
    clauses.push(`gave up ${formatUsdWhole(price.slice(1))} of mining margin`);
  } else if (!isZero(price)) {
    clauses.push(`saved ${formatUsdWhole(price)} on power`);
  }
  if (!isNegative(fourcp) && !isZero(fourcp)) {
    clauses.push(
      `avoided ${formatUsdWhole(fourcp)} of next year's transmission charge`,
    );
  }
  return `It ${joinedClauses(clauses)}.`;
}

function Answer({
  backtest,
  winner,
  baseline,
}: {
  backtest: Backtest;
  winner: Strategy;
  baseline: Strategy;
}) {
  const baselineWins = winner.id === BASELINE_STRATEGY_ID;
  const peaks = backtest.fourcp.peaks.length;
  return (
    <Stack gap="lg">
      <Eyebrow>{ANSWER_LABEL}</Eyebrow>
      <Stack gap="xs">
        <Title order={2}>{winner.label}</Title>
        {baselineWins ? (
          <Text c="var(--ror-text-secondary)">
            {winner.label} made the most money; neither curtailment rule beat
            it.
          </Text>
        ) : (
          <>
            <Group gap="sm" align="baseline">
              <Text
                fz="var(--ror-font-size-hero)"
                fw={600}
                lh={1.1}
                c="var(--ror-good)"
              >
                {formatSignedUsdWhole(
                  backtest.winner.advantage_over_always_on_usd,
                )}
              </Text>
              <Text c="var(--ror-text-secondary)">
                net profit vs. {baseline.label.toLowerCase()}
              </Text>
            </Group>
            <Text c="var(--ror-text-secondary)" maw={560}>
              {winnerSentence(winner)}
            </Text>
          </>
        )}
      </Stack>
      <SimpleGrid
        cols={2}
        spacing="lg"
        pt="md"
        style={{ borderTop: "1px solid var(--ror-line)" }}
      >
        <Kpi
          label={KPI_LABELS.netProfit}
          value={formatUsdWhole(winner.net_profit_usd)}
        />
        <Kpi label={KPI_LABELS.btcMined} value={formatBtc(winner.mined_sats)} />
        <Kpi
          label={KPI_LABELS.hoursOff}
          value={formatHoursSummary(winner.hours_off)}
        />
        <Kpi
          label={KPI_LABELS.peaksRunIn}
          value={`${formatInteger(winner.peaks_running)} of ${formatInteger(peaks)}`}
        />
      </SimpleGrid>
    </Stack>
  );
}

export function Hero({ backtest }: { backtest: Backtest }) {
  const winner = strategyById(backtest, backtest.winner.id);
  const baseline = strategyById(backtest, BASELINE_STRATEGY_ID);
  const baselineWins = winner.id === BASELINE_STRATEGY_ID;
  return (
    <SimpleGrid cols={{ base: 1, md: baselineWins ? 1 : 2 }} spacing="lg">
      <Panel label="Answer">
        <Answer backtest={backtest} winner={winner} baseline={baseline} />
      </Panel>
      {baselineWins ? null : (
        <Panel label="Gain bridge">
          <GainBridge baseline={baseline} winner={winner} />
        </Panel>
      )}
    </SimpleGrid>
  );
}
