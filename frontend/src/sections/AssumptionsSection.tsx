import { List, Stack, Table, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { MODEL_ASSUMPTIONS } from "../config.ts";
import { formatUsd } from "../format.ts";

export function AssumptionsSection({ backtest }: { backtest: Backtest }) {
  const values = backtest.assumptions;
  const rows: [string, string][] = [
    ["Fleet size", `${values.fleet_mw} MW`],
    ["Efficiency", `${values.efficiency_j_per_th} J/TH`],
    ["Pool fee rate", values.pool_fee_rate],
    [
      "Transmission rate",
      `${formatUsd(values.transmission_rate_usd_per_mw_year)} per MW-year`,
    ],
    ["Peak guard threshold", values.peak_guard_threshold],
    ["Settlement point", backtest.period.settlement_point],
  ];
  return (
    <Stack gap="xs">
      <Title order={2} size="h4">
        Assumptions
      </Title>
      <Table>
        <Table.Tbody>
          {rows.map(([name, value]) => (
            <Table.Tr key={name}>
              <Table.Th>{name}</Table.Th>
              <Table.Td>{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <List type="ordered" spacing={4}>
        {MODEL_ASSUMPTIONS.map((assumption) => (
          <List.Item key={assumption}>{assumption}</List.Item>
        ))}
      </List>
    </Stack>
  );
}
