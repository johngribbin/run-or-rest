import {
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
} from "@mantine/core";
import { useMemo, useState } from "react";
import type { Backtest } from "../api/backtest.ts";
import { BacktestChart } from "../chart/BacktestChart.tsx";
import {
  FULL_ZOOM,
  type ZoomWindow,
  chartExtent,
  chartOption,
  visibleExtent,
  zoomFor,
} from "../chart/option.ts";
import { centralMonths } from "../chart/time.ts";
import { CHART_COPY, COLOR_TOKENS, DEFAULT_COLOR_SCHEME } from "../config.ts";
import { ChartLegend } from "./ChartLegend.tsx";
import { OffLanes } from "./OffLanes.tsx";
import { Panel } from "./ui.tsx";

export function ChartSection({ backtest }: { backtest: Backtest }) {
  const scheme = useComputedColorScheme(DEFAULT_COLOR_SCHEME);
  const [range, setRange] = useState(CHART_COPY.season);
  const [requested, setRequested] = useState<ZoomWindow>(FULL_ZOOM);
  const [shown, setShown] = useState<ZoomWindow>(FULL_ZOOM);
  const option = useMemo(
    () => chartOption(backtest, COLOR_TOKENS[scheme]),
    [backtest, scheme],
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
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={2}>
            <Title order={3} component="h2">
              {CHART_COPY.heading}
            </Title>
            <Text c="var(--ror-text-secondary)">
              {backtest.period.settlement_point} {CHART_COPY.subtitleTail}
            </Text>
          </Stack>
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
        </Group>
        <ChartLegend />
        <BacktestChart option={option} zoom={requested} onZoom={setShown} />
        <OffLanes backtest={backtest} visible={visibleExtent(extent, shown)} />
      </Stack>
    </Panel>
  );
}
