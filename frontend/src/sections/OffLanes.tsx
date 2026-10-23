import { Box, Group, Stack, Text } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import {
  type Extent,
  LANE_UNITS,
  intervalMs,
  laneRects,
  offBands,
} from "../chart/option.ts";
import { CHART_COPY, CHART_GRID_PX, CHART_LANE_HEIGHT_PX } from "../config.ts";
import { formatHoursSummary } from "../format.ts";
import { Eyebrow } from "./ui.tsx";

export function OffLanes({
  backtest,
  visible,
}: {
  backtest: Backtest;
  visible: Extent;
}) {
  const interval = intervalMs(backtest);
  return (
    <Stack gap="sm" pt="md" style={{ borderTop: "1px solid var(--ror-line)" }}>
      <Eyebrow>{CHART_COPY.lanesTitle}</Eyebrow>
      <Stack
        component="ul"
        gap="sm"
        m={0}
        p={0}
        aria-label={CHART_COPY.lanesTitle}
      >
        {backtest.strategies.map((strategy) => {
          const winner = strategy.id === backtest.winner.id;
          const hours = `${formatHoursSummary(strategy.hours_off)} ${CHART_COPY.hoursUnit}`;
          const rects = laneRects(
            offBands(backtest.series, strategy.id, interval),
            visible,
          );
          return (
            <Box
              component="li"
              key={strategy.id}
              aria-label={`${strategy.label}: ${hours}`}
              style={{ listStyle: "none" }}
            >
              <Group
                justify="space-between"
                pl={CHART_GRID_PX.left}
                pr={CHART_GRID_PX.right}
              >
                <Text
                  size="xs"
                  fw={winner ? 600 : 400}
                  c={winner ? "var(--ror-text)" : "var(--ror-text-secondary)"}
                >
                  {strategy.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {hours}
                </Text>
              </Group>
              <Box pl={CHART_GRID_PX.left} pr={CHART_GRID_PX.right}>
                <svg
                  viewBox={`0 0 ${String(LANE_UNITS)} 1`}
                  preserveAspectRatio="none"
                  width="100%"
                  height={CHART_LANE_HEIGHT_PX}
                  aria-hidden="true"
                  style={{
                    display: "block",
                    background: "var(--ror-surface-raised)",
                    borderRadius: 3,
                  }}
                >
                  {rects.map((rect) => (
                    <rect
                      key={rect.x}
                      x={rect.x}
                      y={0}
                      width={Math.max(rect.width, 1)}
                      height={1}
                      fill={winner ? "var(--ror-accent)" : "var(--ror-lane)"}
                    />
                  ))}
                </svg>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
