import {
  Alert,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Backtest, fetchBacktest } from "./api/backtest.ts";
import {
  LOADING_TEXT,
  REFETCH_DEBOUNCE_MS,
  STALE_OPACITY,
  UPDATING_TEXT,
} from "./config.ts";
import { AssumptionsSection } from "./sections/AssumptionsSection.tsx";
import { BitcoinInputs } from "./sections/BitcoinInputs.tsx";
import { ChartSection } from "./sections/ChartSection.tsx";
import { Footer } from "./sections/Footer.tsx";
import { Header } from "./sections/Header.tsx";
import { Hero } from "./sections/Hero.tsx";
import { StrategyCards } from "./sections/StrategyCards.tsx";
import { ThresholdControl } from "./sections/ThresholdControl.tsx";

function Results({
  backtest,
  stale,
  threshold,
  onThresholdChange,
}: {
  backtest: Backtest;
  stale: boolean;
  threshold: string | null;
  onThresholdChange: (value: string) => void;
}) {
  const control = backtest.controls.peak_guard_threshold;
  const shown = { opacity: stale ? STALE_OPACITY : 1 };
  return (
    <Stack gap="lg">
      <Stack gap="lg" style={shown} aria-busy={stale}>
        <Hero backtest={backtest} />
      </Stack>
      <ThresholdControl
        control={control}
        value={threshold ?? control.default}
        onChange={onThresholdChange}
      />
      {stale ? (
        <Group gap="xs" role="status">
          <Loader size="xs" />
          <Text size="sm">{UPDATING_TEXT}</Text>
        </Group>
      ) : null}
      <Stack gap="lg" style={shown} aria-busy={stale}>
        <StrategyCards backtest={backtest} />
        <ChartSection backtest={backtest} />
        <BitcoinInputs backtest={backtest} />
        <AssumptionsSection backtest={backtest} />
      </Stack>
    </Stack>
  );
}

export function App() {
  const [threshold, setThreshold] = useState<string | null>(null);
  const [requested] = useDebouncedValue(threshold, REFETCH_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ["backtest", requested],
    queryFn: ({ signal }) => fetchBacktest(requested, signal),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) {
    return (
      <Center h="100vh" role="status">
        <Loader color="var(--ror-accent)" />
        <VisuallyHidden>{LOADING_TEXT}</VisuallyHidden>
      </Center>
    );
  }

  return (
    <>
      <Header backtest={query.data} />
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {query.isError ? (
            <Alert color="red" title="The backtest could not be loaded">
              {query.error.message}
            </Alert>
          ) : null}
          {query.isSuccess ? (
            <Results
              backtest={query.data}
              stale={query.isPlaceholderData}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />
          ) : null}
          <Footer />
        </Stack>
      </Container>
    </>
  );
}
