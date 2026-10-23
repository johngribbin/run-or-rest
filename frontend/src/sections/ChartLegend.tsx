import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { CHART_COPY, CHART_SERIES_NAMES, TOOLTIPS } from "../config.ts";
import { Term } from "./Term.tsx";

function Entry({
  swatch,
  children,
}: {
  swatch: ReactNode;
  children: ReactNode;
}) {
  return (
    <Group gap={6} wrap="nowrap" role="listitem">
      {swatch}
      <Text size="xs" c="var(--ror-text-secondary)">
        {children}
      </Text>
    </Group>
  );
}

function LineSwatch({
  color,
  dashed = false,
}: {
  color: string;
  dashed?: boolean;
}) {
  return (
    <Box
      w={16}
      style={{ borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
    />
  );
}

export function ChartLegend() {
  return (
    <Group gap="lg" aria-label="Chart legend" role="list">
      <Entry swatch={<LineSwatch color="var(--ror-price)" />}>
        {CHART_SERIES_NAMES.price}
      </Entry>
      <Entry swatch={<LineSwatch color="var(--ror-text)" dashed />}>
        <Term tooltip={TOOLTIPS.breakeven}>{CHART_SERIES_NAMES.breakeven}</Term>
      </Entry>
      <Entry swatch={<Box w={2} h={12} bg="var(--ror-peak)" />}>
        {CHART_COPY.peakLegend}
      </Entry>
    </Group>
  );
}
