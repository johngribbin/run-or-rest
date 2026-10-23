import { Group, Slider, Stack, Text } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { THRESHOLD_LABEL, TOOLTIPS } from "../config.ts";
import { formatPercent } from "../format.ts";
import { Term } from "./Term.tsx";

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
    <Stack gap={4}>
      <Text fw={600} size="lg" id="threshold-label">
        <Term tooltip={TOOLTIPS.peakGuardThreshold}>{THRESHOLD_LABEL}</Term>
      </Text>
      <Group gap="md" wrap="nowrap">
        <Slider
          style={{ flex: 1 }}
          aria-labelledby="threshold-label"
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
        <Text fw={600} size="lg" data-testid="threshold-value">
          {formatPercent(value)}
        </Text>
      </Group>
    </Stack>
  );
}
