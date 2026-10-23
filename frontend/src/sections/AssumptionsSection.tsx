import { Accordion, List, Paper, SimpleGrid, Table } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { Backtest } from "../api/backtest.ts";
import {
  ASSUMPTIONS_HEADING,
  ASSUMPTIONS_ID,
  DATA_QUALITY_LABEL,
  MODEL_ASSUMPTIONS,
  THRESHOLD_LABEL,
} from "../config.ts";
import { formatCentralTime } from "../chart/time.ts";
import { formatInteger, formatPercent, formatUsd } from "../format.ts";

export function AssumptionsSection({
  backtest,
  open,
  onOpenChange,
  jump,
}: {
  backtest: Backtest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jump: number;
}) {
  const section = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (jump > 0) {
      section.current?.scrollIntoView({ block: "start" });
    }
  }, [jump]);
  const values = backtest.assumptions;
  const { expected_intervals: expected, missing_intervals: missing } =
    backtest.data_quality;
  const rows: [string, string][] = [
    ["Fleet size", `${values.fleet_mw} MW`],
    ["Efficiency", `${values.efficiency_j_per_th} J/TH`],
    ["Pool fee rate", formatPercent(values.pool_fee_rate)],
    [
      "Transmission rate",
      `${formatUsd(values.transmission_rate_usd_per_mw_year)} per MW-year`,
    ],
    [THRESHOLD_LABEL, formatPercent(values.peak_guard_threshold)],
    [
      "Period",
      `${formatCentralTime(backtest.period.start_utc)} to ${formatCentralTime(backtest.period.end_utc)}`,
    ],
    ["Settlement point", backtest.period.settlement_point],
    [
      DATA_QUALITY_LABEL,
      `${formatInteger(expected - missing)} of ${formatInteger(expected)} (${formatInteger(missing)} skipped for missing data)`,
    ],
  ];
  return (
    <Paper
      ref={section}
      id={ASSUMPTIONS_ID}
      component="section"
      aria-label={ASSUMPTIONS_HEADING}
      withBorder
      bg="var(--ror-surface)"
      style={{ borderColor: "var(--ror-line)", overflow: "hidden" }}
    >
      <Accordion
        chevronPosition="right"
        transitionDuration={0}
        value={open ? ASSUMPTIONS_ID : null}
        onChange={(value) => {
          onOpenChange(value === ASSUMPTIONS_ID);
        }}
      >
        <Accordion.Item value={ASSUMPTIONS_ID} style={{ borderBottom: 0 }}>
          <Accordion.Control px="xl" py="xs" fw={600} fz="lg">
            {ASSUMPTIONS_HEADING}
          </Accordion.Control>
          <Accordion.Panel px="md" pb="md">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
              <Table verticalSpacing={6} borderColor="var(--ror-line)">
                <Table.Tbody>
                  {rows.map(([name, value]) => (
                    <Table.Tr key={name}>
                      <Table.Th fw={400} c="dimmed" w="40%">
                        {name}
                      </Table.Th>
                      <Table.Td>{value}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <List
                type="ordered"
                spacing={6}
                c="var(--ror-text-secondary)"
                size="sm"
              >
                {MODEL_ASSUMPTIONS.map((assumption) => (
                  <List.Item key={assumption}>{assumption}</List.Item>
                ))}
              </List>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  );
}
