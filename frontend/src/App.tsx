import {
  Alert,
  Container,
  Divider,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Backtest, fetchBacktest } from "./api/backtest.ts";
import { APP_SUBTITLE, APP_TITLE, REFETCH_DEBOUNCE_MS } from "./config.ts";
import { Answer } from "./sections/Answer.tsx";
import { AssumptionsSection } from "./sections/AssumptionsSection.tsx";
import { ChartSection } from "./sections/ChartSection.tsx";
import { Footer } from "./sections/Footer.tsx";
import { ResultsTable } from "./sections/ResultsTable.tsx";
import { ThresholdControl } from "./sections/ThresholdControl.tsx";

function Results({
  backtest,
  threshold,
  onThresholdChange,
}: {
  backtest: Backtest;
  threshold: string | null;
  onThresholdChange: (value: string) => void;
}) {
  const control = backtest.controls.peak_guard_threshold;
  return (
    <Stack gap="xl">
      <Answer backtest={backtest} />
      <ThresholdControl
        control={control}
        value={threshold ?? control.default}
        onChange={onThresholdChange}
      />
      <ResultsTable backtest={backtest} />
      <ChartSection backtest={backtest} />
      <AssumptionsSection backtest={backtest} />
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

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1}>{APP_TITLE}</Title>
          <Text c="dimmed">{APP_SUBTITLE}</Text>
        </Stack>
        {query.isPending ? (
          <Stack align="center" gap="xs" role="status">
            <Loader />
            <Text>Running the backtest…</Text>
          </Stack>
        ) : null}
        {query.isError ? (
          <Alert color="red" title="The backtest could not be loaded">
            {query.error.message}
          </Alert>
        ) : null}
        {query.isSuccess ? (
          <Results
            backtest={query.data}
            threshold={threshold}
            onThresholdChange={setThreshold}
          />
        ) : null}
        <Divider />
        <Footer />
      </Stack>
    </Container>
  );
}
