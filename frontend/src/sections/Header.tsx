import {
  ActionIcon,
  Badge,
  Box,
  Container,
  Group,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { formatPeriod } from "../chart/time.ts";
import {
  APP_SUBTITLE,
  APP_TITLE,
  COLOR_SCHEME_TOGGLE_LABELS,
  DEFAULT_COLOR_SCHEME,
} from "../config.ts";
import { formatPercent } from "../format.ts";

function SchemeIcon({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {scheme === "dark" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : (
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      )}
    </svg>
  );
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme(DEFAULT_COLOR_SCHEME);
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={COLOR_SCHEME_TOGGLE_LABELS[scheme]}
      onClick={() => {
        setColorScheme(scheme === "dark" ? "light" : "dark");
      }}
    >
      <SchemeIcon scheme={scheme} />
    </ActionIcon>
  );
}

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
          <Group gap="sm">
            {backtest === undefined ? null : <RunChips backtest={backtest} />}
            <ColorSchemeToggle />
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
