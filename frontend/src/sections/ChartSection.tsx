import { Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  BASELINE_STRATEGY_ID,
  type Backtest,
  type StrategyId,
  strategyById,
} from "../api/backtest.ts";
import { EChart } from "../chart/EChart.tsx";
import {
  FULL_ZOOM,
  type ZoomWindow,
  chartExtent,
  chartOption,
  zoomFor,
} from "../chart/option.ts";
import { centralMonths } from "../chart/time.ts";
import { CHART_COPY, CHART_HEIGHT_PX } from "../config.ts";
import { ChartLegend } from "./ChartLegend.tsx";
import { Panel } from "./ui.tsx";

export function ChartSection({ backtest }: { backtest: Backtest }) {
  const [range, setRange] = useState(CHART_COPY.season);
  const [requested, setRequested] = useState<ZoomWindow>(FULL_ZOOM);
  const curtailing = backtest.strategies.filter(
    (strategy) => strategy.id !== BASELINE_STRATEGY_ID,
  );
  const [picked, setPicked] = useState<StrategyId>(
    backtest.winner.id === BASELINE_STRATEGY_ID
      ? (curtailing[0]?.id ?? BASELINE_STRATEGY_ID)
      : backtest.winner.id,
  );
  const option = useMemo(
    () => chartOption(backtest, strategyById(backtest, picked)),
    [backtest, picked],
  );
  const extent = chartExtent(backtest);
  const ranges = [
    { label: CHART_COPY.season, zoom: FULL_ZOOM },
    ...centralMonths(backtest.period.start_utc, backtest.period.end_utc).map(
      (month) => ({
        label: month.label,
        zoom: zoomFor(extent, { min: month.from, max: month.to }),
      }),
    ),
  ];
  return (
    <Panel label={CHART_COPY.heading}>
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={3} component="h2">
            {CHART_COPY.heading}
          </Title>
          <Text c="var(--ror-text-secondary)">
            {backtest.period.settlement_point} {CHART_COPY.subtitleTail}
          </Text>
        </Stack>
        <Group justify="space-between" gap="md">
          <ChartLegend />
          <Group gap="sm">
            <SegmentedControl
              aria-label={CHART_COPY.rangeLabel}
              size="xs"
              value={range}
              data={ranges.map((item) => item.label)}
              onChange={(label) => {
                const match = ranges.find((item) => item.label === label);
                if (match !== undefined) {
                  setRange(match.label);
                  setRequested(match.zoom);
                }
              }}
            />
            <SegmentedControl
              aria-label={CHART_COPY.offPicker}
              size="xs"
              value={picked}
              data={curtailing.map((strategy) => ({
                label: strategy.label,
                value: strategy.id,
              }))}
              onChange={(value) => {
                const match = curtailing.find((item) => item.id === value);
                if (match !== undefined) {
                  setPicked(match.id);
                }
              }}
            />
          </Group>
        </Group>
        <EChart
          option={option}
          label={CHART_COPY.chartLabel}
          height={CHART_HEIGHT_PX}
          zoom={requested}
        />
      </Stack>
    </Panel>
  );
}
