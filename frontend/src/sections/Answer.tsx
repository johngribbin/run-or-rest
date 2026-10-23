import { Stack, Text, Title } from "@mantine/core";
import {
  BASELINE_STRATEGY_ID,
  type Backtest,
  strategyById,
} from "../api/backtest.ts";
import { QUESTION, TOOLTIPS } from "../config.ts";
import { formatUsd } from "../format.ts";
import { Term } from "./Term.tsx";

export function Answer({ backtest }: { backtest: Backtest }) {
  const { id, advantage_over_always_on_usd: advantage } = backtest.winner;
  const label = strategyById(backtest, id).label;
  const baseline = strategyById(backtest, BASELINE_STRATEGY_ID).label;
  return (
    <Stack gap="xs">
      <Title order={3} component="h2">
        {QUESTION.map((segment) =>
          typeof segment === "string" ? (
            segment
          ) : (
            <Term
              key={segment.strategy}
              tooltip={TOOLTIPS.strategies[segment.strategy]}
            >
              {segment.text}
            </Term>
          ),
        )}
      </Title>
      {id === BASELINE_STRATEGY_ID ? (
        <Text size="lg">
          <strong>{label}</strong> made the most money; neither curtailment rule
          beat it.
        </Text>
      ) : (
        <Text size="lg">
          <strong>{label}</strong> made the most money:{" "}
          <strong>{formatUsd(advantage)}</strong> more than{" "}
          {baseline.toLowerCase()}.
        </Text>
      )}
    </Stack>
  );
}
