import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import type { Backtest, StrategyId } from "../api/backtest.ts";
import { BacktestChart } from "../chart/BacktestChart.tsx";
import { chartOption } from "../chart/option.ts";
import { ChartLegend } from "./ChartLegend.tsx";

export function ChartSection({ backtest }: { backtest: Backtest }) {
  const [selected, setSelected] = useState<StrategyId>(backtest.winner.id);
  const option = useMemo(
    () => chartOption(backtest, selected),
    [backtest, selected],
  );
  return (
    <Stack gap="xs">
      <Text fw={600}>Shaded where this strategy is off</Text>
      <SegmentedControl
        aria-label="Strategy shown on the chart"
        value={selected}
        onChange={(value) => {
          const match = backtest.strategies.find((item) => item.id === value);
          if (match !== undefined) {
            setSelected(match.id);
          }
        }}
        data={backtest.strategies.map((strategy) => ({
          label: strategy.label,
          value: strategy.id,
        }))}
      />
      <ChartLegend />
      <BacktestChart option={option} />
    </Stack>
  );
}
