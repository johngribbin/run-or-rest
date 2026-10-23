import { Group, Slider, Stack, Text } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import {
  THRESHOLD_END_LABELS,
  THRESHOLD_HELP,
  THRESHOLD_LABEL,
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
  onChange,
}: {
  control: Control;
  value: string;
  onChange: (value: string) => void;
}) {
  const places = decimals(control.step);
  return (
    <Panel label={THRESHOLD_LABEL}>
      <Group gap="xl" align="center" wrap="wrap">
        <Stack gap={2} style={{ flex: "1 1 240px" }}>
          <Group justify="space-between" align="baseline">
            <Text fw={600} size="lg" id="threshold-label">
              {THRESHOLD_LABEL}
            </Text>
            <Text size="xl" fw={600} data-testid="threshold-value">
              {formatPercent(value)}
            </Text>
          </Group>
          <Text c="var(--ror-text-secondary)" id="threshold-help">
            {THRESHOLD_HELP}
          </Text>
        </Stack>
        <Stack gap={6} style={{ flex: "2 1 320px" }}>
          <Slider
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
      </Group>
    </Panel>
  );
}
