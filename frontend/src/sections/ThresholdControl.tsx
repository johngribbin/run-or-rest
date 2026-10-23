import { Group, Slider, Stack, Text, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import {
  THRESHOLD_DEFAULT_NOTE,
  THRESHOLD_END_LABELS,
  THRESHOLD_HELP,
  THRESHOLD_LABEL,
  THRESHOLD_SCOPE,
} from "../config.ts";
import { formatPercent } from "../format.ts";
import { Panel } from "./ui.tsx";

type Control = Backtest["controls"]["peak_guard_threshold"];

function decimals(step: string): number {
  return step.split(".")[1]?.length ?? 0;
}

export function ThresholdControl({
  control,
  value,
  rule,
  onChange,
}: {
  control: Control;
  value: string;
  rule: string;
  onChange: (value: string) => void;
}) {
  const places = decimals(control.step);
  return (
    <Panel label={THRESHOLD_LABEL}>
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={3} component="h2" id="threshold-label">
            {THRESHOLD_LABEL}
          </Title>
          <Text c="var(--ror-text-secondary)" id="threshold-help">
            {THRESHOLD_HELP(formatPercent(value))} {THRESHOLD_SCOPE(rule)}{" "}
            {THRESHOLD_DEFAULT_NOTE(formatPercent(control.default))}
          </Text>
        </Stack>
        <Group gap="lg" align="center" wrap="nowrap">
          <Stack gap={6} style={{ flex: 1 }}>
            <Slider
              color="var(--ror-accent)"
              thumbSize={24}
              aria-labelledby="threshold-label"
              thumbProps={{
                "aria-labelledby": "threshold-label",
                "aria-describedby": "threshold-help",
              }}
              min={Number(control.min)}
              max={Number(control.max)}
              step={Number(control.step)}
              precision={places}
              value={Number(value)}
              label={(current) => formatPercent(current.toFixed(places))}
              onChange={(current) => {
                onChange(current.toFixed(places));
              }}
            />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {formatPercent(control.min)} · {THRESHOLD_END_LABELS.min}
              </Text>
              <Text size="xs" c="dimmed">
                {formatPercent(control.max)} · {THRESHOLD_END_LABELS.max}
              </Text>
            </Group>
          </Stack>
          <Text
            size="xl"
            fw={600}
            miw={64}
            ta="right"
            mb={22}
            data-testid="threshold-value"
          >
            {formatPercent(value)}
          </Text>
        </Group>
      </Stack>
    </Panel>
  );
}
