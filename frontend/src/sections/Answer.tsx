import { Stack, Text, Title } from "@mantine/core";
import type { Backtest } from "../api/backtest.ts";
import { QUESTION, TOOLTIPS } from "../config.ts";
import { formatUsd } from "../format.ts";
import { Term } from "./Term.tsx";

export function Answer({ backtest }: { backtest: Backtest }) {
  const { id, advantage_over_always_on_usd: advantage } = backtest.winner;
  const label =
    backtest.strategies.find((strategy) => strategy.id === id)?.label ?? id;
  return (
    <Stack gap="xs">
      <Title order={2} size="h4">
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
      {id === "always_on" ? (
        <Text size="lg">
          <strong>{label}</strong> made the most money; neither curtailment rule
          beat it.
        </Text>
      ) : (
        <Text size="lg">
          <strong>{label}</strong> made the most money:{" "}
          <strong>{formatUsd(advantage)}</strong> more than always on.
        </Text>
      )}
    </Stack>
  );
}
