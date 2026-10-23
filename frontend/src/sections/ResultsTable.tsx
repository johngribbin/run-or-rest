import { Badge, Stack, Table, Text } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { TOOLTIPS } from "../config.ts";
import { formatHours, formatInteger, formatUsd } from "../format.ts";
import { Term } from "./Term.tsx";

const HEADERS: { title: string; tooltip?: string }[] = [
  { title: "Strategy" },
  { title: "Revenue" },
  { title: "Energy cost" },
  { title: "Transmission", tooltip: TOOLTIPS.transmission },
  { title: "Net profit" },
  { title: "Hours off", tooltip: TOOLTIPS.hoursOff },
  { title: "Price gain", tooltip: TOOLTIPS.priceGain },
  { title: "4CP gain", tooltip: TOOLTIPS.fourcpGain },
];

function DataQuality({ backtest }: { backtest: Backtest }) {
  const { expected_intervals, missing_intervals } = backtest.data_quality;
  return (
    <Text size="sm" c="dimmed">
      Intervals skipped for missing data: {formatInteger(missing_intervals)} of{" "}
      {formatInteger(expected_intervals)}
    </Text>
  );
}

export function ResultsTable({ backtest }: { backtest: Backtest }) {
  return (
    <Stack gap="xs">
      <Table.ScrollContainer minWidth={760}>
        <Table striped highlightOnHover aria-label="Results by strategy">
          <Table.Thead>
            <Table.Tr>
              {HEADERS.map(({ title, tooltip }) => (
                <Table.Th key={title}>
                  {tooltip === undefined ? (
                    title
                  ) : (
                    <Term tooltip={tooltip}>{title}</Term>
                  )}
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
                  bg={winner ? "var(--mantine-color-teal-light)" : undefined}
                >
                  <Table.Td>
                    <Term tooltip={TOOLTIPS.strategies[strategy.id]}>
                      {strategy.label}
                    </Term>{" "}
                    {winner ? (
                      <Badge color="teal" variant="filled" size="sm">
                        Winner
                      </Badge>
                    ) : null}
                  </Table.Td>
                  <Table.Td>{formatUsd(strategy.revenue_usd)}</Table.Td>
                  <Table.Td>{formatUsd(strategy.energy_cost_usd)}</Table.Td>
                  <Table.Td>{formatUsd(strategy.transmission_usd)}</Table.Td>
                  <Table.Td>{formatUsd(strategy.net_profit_usd)}</Table.Td>
                  <Table.Td>{formatHours(strategy.hours_off)}</Table.Td>
                  <Table.Td>
                    {formatUsd(strategy.gain_vs_always_on.price_usd)}
                  </Table.Td>
                  <Table.Td>
                    {formatUsd(strategy.gain_vs_always_on.fourcp_usd)}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <DataQuality backtest={backtest} />
    </Stack>
  );
}
