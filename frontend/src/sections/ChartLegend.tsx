import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { CHART_COLORS, CHART_SERIES_NAMES, TOOLTIPS } from "../config.ts";
import { Term } from "./Term.tsx";

function Entry({
  swatch,
  children,
}: {
  swatch: ReactNode;
  children: ReactNode;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      {swatch}
      <Text size="sm">{children}</Text>
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
      w={18}
      style={{ borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
    />
  );
}

export function ChartLegend() {
  return (
    <Group gap="lg" aria-label="Chart legend" role="list">
      <div role="listitem">
        <Entry swatch={<LineSwatch color={CHART_COLORS.price} />}>
          {CHART_SERIES_NAMES.price}
        </Entry>
      </div>
      <div role="listitem">
        <Entry swatch={<LineSwatch color={CHART_COLORS.breakeven} />}>
          <Term tooltip={TOOLTIPS.breakevenEstimate}>
            {CHART_SERIES_NAMES.breakeven}
          </Term>
        </Entry>
      </div>
      <div role="listitem">
        <Entry swatch={<Box w={18} h={10} bg={CHART_COLORS.offBand} />}>
          Switched off
        </Entry>
      </div>
      <div role="listitem">
        <Entry swatch={<LineSwatch color={CHART_COLORS.peak} dashed />}>
          4CP peak
        </Entry>
      </div>
    </Group>
  );
}
