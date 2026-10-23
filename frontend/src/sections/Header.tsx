import {
  Badge,
  Box,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { formatPeriod } from "../chart/time.ts";
import { APP_SUBTITLE, APP_TITLE } from "../config.ts";
import { formatPercent } from "../format.ts";

function RunChips({ backtest }: { backtest: Backtest }) {
  const { period, assumptions } = backtest;
  const chips = [
    formatPeriod(period.start_utc, period.end_utc),
    period.settlement_point,
    `${assumptions.fleet_mw} MW · ${assumptions.efficiency_j_per_th} J/TH · ${formatPercent(assumptions.pool_fee_rate)} pool fee`,
  ];
  return (
    <Group gap="xs" component="ul" aria-label="This run" m={0} p={0}>
      {chips.map((chip) => (
        <Badge
          key={chip}
          component="li"
          variant="default"
          size="lg"
          radius="xl"
          tt="none"
          fw={500}
          c="var(--ror-text-secondary)"
        >
          {chip}
        </Badge>
      ))}
    </Group>
  );
}

export function Header({ backtest }: { backtest: Backtest | undefined }) {
  return (
    <Box
      component="header"
      style={{ borderBottom: "1px solid var(--ror-line)" }}
    >
      <Container size="lg" py="md">
        <Group justify="space-between" gap="md">
          <Stack gap={0}>
            <Title order={1}>{APP_TITLE}</Title>
            <Text size="xs" c="dimmed">
              {APP_SUBTITLE}
            </Text>
          </Stack>
          {backtest === undefined ? null : <RunChips backtest={backtest} />}
        </Group>
      </Container>
    </Box>
  );
}
