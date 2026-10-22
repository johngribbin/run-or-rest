import { Badge, Table } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { formatHours, formatUsd } from "../format.ts";

const HEADERS = [
  "Strategy",
  "Revenue",
  "Energy cost",
  "Transmission",
  "Net profit",
  "Hours off",
  "Price gain",
  "4CP gain",
];

export function ResultsTable({ backtest }: { backtest: Backtest }) {
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table striped highlightOnHover aria-label="Results by strategy">
        <Table.Thead>
          <Table.Tr>
            {HEADERS.map((header) => (
              <Table.Th key={header}>{header}</Table.Th>
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
                  {strategy.label}{" "}
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
  );
}
