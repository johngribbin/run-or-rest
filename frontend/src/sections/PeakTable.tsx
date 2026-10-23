import { Table, Text, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { formatPeakMoment } from "../chart/time.ts";
import { FOURCP_EXPLAINER } from "../config.ts";
import { formatDecimal, formatPrice, formatUsdWhole } from "../format.ts";

const GROUP_BORDER = { borderLeft: "1px solid var(--ror-line)" };

function Heading({ children }: { children: string }) {
  return (
    <Text size="xs" fw={500} c="dimmed" span>
      {children}
    </Text>
  );
}

export function PeakTable({ backtest }: { backtest: Backtest }) {
  const { peaks, charge_per_peak_usd: perPeak } = backtest.fourcp;
  const charge = formatUsdWhole(perPeak);
  return (
    <>
      <Title order={3} px="xl" pt="lg" pb="sm">
        {FOURCP_EXPLAINER.peaksHeading}
      </Title>
      <Table.ScrollContainer minWidth={860}>
        <Table
          aria-label={FOURCP_EXPLAINER.peaksHeading}
          horizontalSpacing="md"
          verticalSpacing="sm"
          borderColor="var(--ror-line)"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Heading>Peak</Heading>
              </Table.Th>
              <Table.Th ta="right">
                <Heading>{FOURCP_EXPLAINER.load}</Heading>
              </Table.Th>
              <Table.Th ta="right">
                <Heading>{FOURCP_EXPLAINER.price}</Heading>
              </Table.Th>
              {backtest.strategies.map((strategy, index) => (
                <Table.Th
                  key={strategy.id}
                  ta="right"
                  style={index === 0 ? GROUP_BORDER : undefined}
                >
                  <Heading>{strategy.label}</Heading>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {peaks.map((peak) => (
              <Table.Tr key={peak.month}>
                <Table.Td>{formatPeakMoment(peak.interval_start_utc)}</Table.Td>
                <Table.Td ta="right">
                  {formatDecimal(peak.system_load_mw)} MW
                </Table.Td>
                <Table.Td ta="right">
                  {formatPrice(peak.price_usd_per_mwh)}
                </Table.Td>
                {backtest.strategies.map((strategy, index) => {
                  const running = peak.decisions[strategy.id] === "run";
                  return (
                    <Table.Td
                      key={strategy.id}
                      ta="right"
                      c={running ? "var(--ror-bad)" : "var(--ror-good)"}
                      style={index === 0 ? GROUP_BORDER : undefined}
                    >
                      {running ? charge : formatUsdWhole("0")}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}
