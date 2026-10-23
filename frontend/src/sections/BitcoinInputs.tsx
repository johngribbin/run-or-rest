import {
  Badge,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { type ReactNode, useMemo } from "react";
import type { Backtest } from "../api/backtest.ts";
import {
  btcPriceOption,
  difficultyOption,
  hashpriceOption,
} from "../chart/bitcoinOptions.ts";
import { EChart } from "../chart/EChart.tsx";
import { formatCentralTime, formatUtcDay } from "../chart/time.ts";
import { BITCOIN_COPY, SMALL_CHART_HEIGHT_PX, TOOLTIPS } from "../config.ts";
import {
  formatDifficulty,
  formatInteger,
  formatRatioPercent,
  formatSignedRatioPercent,
  formatUsd,
  formatUsdWhole,
} from "../format.ts";
import { Term } from "./Term.tsx";
import { Eyebrow, Panel } from "./ui.tsx";

function Factor({
  children,
  emphasis = false,
}: {
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <Badge
      component="li"
      variant="default"
      size="xl"
      radius="xl"
      tt="none"
      fw={500}
      c={emphasis ? "var(--ror-accent)" : "var(--ror-text)"}
      bg={emphasis ? "var(--ror-accent-soft)" : undefined}
      style={{ listStyle: "none" }}
    >
      {children}
    </Badge>
  );
}

function Operator({ children }: { children: string }) {
  return (
    <Text
      component="li"
      c="dimmed"
      aria-hidden="true"
      style={{ listStyle: "none" }}
    >
      {children}
    </Text>
  );
}

function Formula({ efficiency }: { efficiency: string }) {
  const words = BITCOIN_COPY.formula;
  return (
    <Group
      component="ol"
      gap="xs"
      m={0}
      p={0}
      aria-label={`${words.btcPrice} times ${words.reward} divided by ${words.difficulty} equals ${words.hashprice}, divided by ${words.efficiency} (${efficiency} J/TH) equals ${words.breakeven}`}
    >
      <Factor>{words.btcPrice}</Factor>
      <Operator>×</Operator>
      <Factor>
        <Term tooltip={TOOLTIPS.blockReward}>{words.reward}</Term>
      </Factor>
      <Operator>÷</Operator>
      <Factor>
        <Term tooltip={TOOLTIPS.difficulty}>{words.difficulty}</Term>
      </Factor>
      <Operator>=</Operator>
      <Factor>
        <Term tooltip={TOOLTIPS.hashprice}>{words.hashprice}</Term>
      </Factor>
      <Operator>÷</Operator>
      <Factor>
        <Term tooltip={TOOLTIPS.efficiency(efficiency)}>
          {words.efficiency}
        </Term>
      </Factor>
      <Operator>=</Operator>
      <Factor emphasis>{words.breakeven}</Factor>
    </Group>
  );
}

function Tile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Stack
      gap={2}
      p="md"
      aria-label={label}
      role="group"
      style={{
        border: "1px solid var(--ror-line)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <Text size="xl" fw={600} lh={1.25}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {caption}
      </Text>
    </Stack>
  );
}

function firstAndLast<T>(
  items: readonly T[],
  shown: (item: T) => string,
): string {
  const first = items.at(0);
  const last = items.at(-1);
  return first === undefined || last === undefined
    ? ""
    : `${shown(first)} → ${shown(last)}`;
}

function Tiles({ backtest }: { backtest: Backtest }) {
  const { daily, difficulty_adjustments: adjustments } = backtest.bitcoin;
  const tiles = BITCOIN_COPY.tiles;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <Tile
        label={tiles.btcPrice}
        value={firstAndLast(daily, (day) => formatUsdWhole(day.btc_price_usd))}
        caption={firstAndLast(daily, (day) => formatUtcDay(day.date_utc))}
      />
      <Tile
        label={tiles.adjustments}
        value={formatInteger(Math.max(adjustments.length - 1, 0))}
        caption={firstAndLast(adjustments, (item) =>
          formatDifficulty(item.difficulty),
        )}
      />
      <Tile
        label={tiles.hashprice}
        value={firstAndLast(daily, (day) =>
          formatUsd(day.hashprice_usd_per_ph_day),
        )}
        caption={BITCOIN_COPY.hashpriceCaption}
      />
      <Tile
        label={tiles.feesShare}
        value={firstAndLast(daily, (day) => formatRatioPercent(day.fees_share))}
        caption={BITCOIN_COPY.feesCaption}
      />
    </SimpleGrid>
  );
}

function SmallChart({
  title,
  option,
  children,
}: {
  title: string;
  option: ReturnType<typeof btcPriceOption>;
  children?: ReactNode;
}) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={500} c="var(--ror-text-secondary)">
        {title}
      </Text>
      <EChart option={option} label={title} height={SMALL_CHART_HEIGHT_PX} />
      {children}
    </Stack>
  );
}

function AdjustmentList({ backtest }: { backtest: Backtest }) {
  return (
    <VisuallyHidden component="ol" aria-label={BITCOIN_COPY.adjustmentsList}>
      {backtest.bitcoin.difficulty_adjustments.map((adjustment) => (
        <li key={adjustment.start_utc}>
          {formatCentralTime(adjustment.start_utc)}:{" "}
          {formatDifficulty(adjustment.difficulty)}
          {adjustment.change_ratio === null
            ? ""
            : `, ${formatSignedRatioPercent(adjustment.change_ratio)}`}
        </li>
      ))}
    </VisuallyHidden>
  );
}

export function BitcoinInputs({ backtest }: { backtest: Backtest }) {
  const options = useMemo(
    () => ({
      btcPrice: btcPriceOption(backtest),
      difficulty: difficultyOption(backtest),
      hashprice: hashpriceOption(backtest),
    }),
    [backtest],
  );
  return (
    <Panel label={BITCOIN_COPY.heading}>
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={3} component="h2">
            {BITCOIN_COPY.heading}
          </Title>
          <Text c="var(--ror-text-secondary)">{BITCOIN_COPY.subtitle}</Text>
        </Stack>
        <Formula efficiency={backtest.assumptions.efficiency_j_per_th} />
        <Tiles backtest={backtest} />
        <Stack gap="md">
          <SmallChart
            title={BITCOIN_COPY.charts.btcPrice}
            option={options.btcPrice}
          />
          <SmallChart
            title={BITCOIN_COPY.charts.difficulty}
            option={options.difficulty}
          >
            <AdjustmentList backtest={backtest} />
          </SmallChart>
          <SmallChart
            title={BITCOIN_COPY.charts.hashprice}
            option={options.hashprice}
          />
        </Stack>
      </Stack>
    </Panel>
  );
}
