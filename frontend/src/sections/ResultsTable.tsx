import { Badge, Group, Paper, Table, Text, Title } from "@mantine/core";
import {
  BASELINE_STRATEGY_ID,
  type Backtest,
  type Strategy,
} from "../api/backtest.ts";
import { BEST_BADGE, BREAKDOWN_COPY, TOOLTIPS } from "../config.ts";
import { formatBtc, formatHours, formatInteger, formatUsd } from "../format.ts";
import { PeakTable } from "./PeakTable.tsx";
import { Term } from "./Term.tsx";

interface Column {
  title: string;
  tooltip?: string;
  groupStart?: boolean;
  cell: (strategy: Strategy) => string;
}

function gain(strategy: Strategy, value: string): string {
  return strategy.id === BASELINE_STRATEGY_ID
    ? BREAKDOWN_COPY.noGain
    : formatUsd(value);
}

const COLUMNS: Column[] = [
  { title: "Revenue", cell: (s) => formatUsd(s.revenue_usd) },
  { title: "Energy cost", cell: (s) => formatUsd(s.energy_cost_usd) },
  {
    title: "Transmission",
    tooltip: TOOLTIPS.transmission,
    cell: (s) => formatUsd(s.transmission_usd),
  },
  { title: "Net profit", cell: (s) => formatUsd(s.net_profit_usd) },
  {
    title: "Price gain",
    tooltip: TOOLTIPS.priceGain,
    groupStart: true,
    cell: (s) => gain(s, s.gain_vs_always_on.price_usd),
  },
  {
    title: "4CP gain",
    tooltip: TOOLTIPS.fourcpGain,
    cell: (s) => gain(s, s.gain_vs_always_on.fourcp_usd),
  },
  {
    title: "BTC mined",
    groupStart: true,
    cell: (s) => formatBtc(s.mined_sats),
  },
  {
    title: "Hours off",
    tooltip: TOOLTIPS.hoursOff,
    cell: (s) => formatHours(s.hours_off),
  },
];

const GROUP_BORDER = { borderLeft: "1px solid var(--ror-line)" };

function DataQuality({ backtest }: { backtest: Backtest }) {
  const { expected_intervals: expected, missing_intervals: missing } =
    backtest.data_quality;
  return (
    <Text size="xs" c="dimmed">
      {formatInteger(expected - missing)} of {formatInteger(expected)} intervals
      priced · {formatInteger(missing)} skipped for missing data
    </Text>
  );
}

export function ResultsTable({ backtest }: { backtest: Backtest }) {
  return (
    <Paper
      component="section"
      aria-label={BREAKDOWN_COPY.heading}
      withBorder
      bg="var(--ror-surface)"
      style={{ borderColor: "var(--ror-line)", overflow: "hidden" }}
    >
      <Group justify="space-between" align="baseline" gap="xs" p="xl" pb="sm">
        <Title order={3} component="h2">
          {BREAKDOWN_COPY.heading}
        </Title>
        <DataQuality backtest={backtest} />
      </Group>
      <Table.ScrollContainer minWidth={860}>
        <Table
          aria-label={BREAKDOWN_COPY.tableLabel}
          horizontalSpacing="md"
          verticalSpacing="sm"
          borderColor="var(--ror-line)"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Text size="xs" fw={500} c="dimmed">
                  Rule
                </Text>
              </Table.Th>
              {COLUMNS.map((column) => (
                <Table.Th
                  key={column.title}
                  ta="right"
                  style={column.groupStart === true ? GROUP_BORDER : undefined}
                >
                  <Text size="xs" fw={500} c="dimmed" span>
                    {column.tooltip === undefined ? (
                      column.title
                    ) : (
                      <Term tooltip={column.tooltip}>{column.title}</Term>
                    )}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {backtest.strategies.map((strategy) => {
              const winner = strategy.id === backtest.winner.id;
              return (
                <Table.Tr
                  key={strategy.id}
                  aria-current={winner ? "true" : undefined}
                  bg={winner ? "var(--ror-accent-soft)" : undefined}
                >
                  <Table.Td fw={winner ? 600 : 400}>
                    <Group gap="xs" wrap="nowrap">
                      {strategy.label}
                      {winner ? (
                        <Badge
                          variant="light"
                          bg="var(--ror-accent-soft)"
                          c="var(--ror-accent)"
                          tt="none"
                          radius="xl"
                          size="sm"
                        >
                          {BEST_BADGE}
                        </Badge>
                      ) : null}
                    </Group>
                  </Table.Td>
                  {COLUMNS.map((column) => (
                    <Table.Td
                      key={column.title}
                      ta="right"
                      style={
                        column.groupStart === true ? GROUP_BORDER : undefined
                      }
                    >
                      {column.cell(strategy)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <PeakTable backtest={backtest} />
    </Paper>
  );
}
