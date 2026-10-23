import { Box, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { Strategy } from "../api/backtest.ts";
import { BRIDGE_TITLE, GAIN_LABELS } from "../config.ts";
import { formatSignedUsdWhole, formatUsdWhole } from "../format.ts";

type Tone = "base" | "good" | "bad" | "accent";

interface Bar {
  name: string;
  shown: string;
  from: number;
  to: number;
  tone: Tone;
}

const TONE_COLORS: Record<Tone, string> = {
  base: "var(--ror-lane)",
  good: "var(--ror-good)",
  bad: "var(--ror-bad)",
  accent: "var(--ror-accent)",
};

function gainTone(value: string): Tone {
  return value.startsWith("-") ? "bad" : "good";
}

function bridgeBars(baseline: Strategy, winner: Strategy): Bar[] {
  const gain = winner.gain_vs_always_on;
  const start = Number(baseline.net_profit_usd);
  const end = Number(winner.net_profit_usd);
  const afterPrice = start + Number(gain.price_usd);
  return [
    {
      name: baseline.label,
      shown: formatUsdWhole(baseline.net_profit_usd),
      from: 0,
      to: start,
      tone: "base",
    },
    {
      name: GAIN_LABELS.price,
      shown: formatSignedUsdWhole(gain.price_usd),
      from: start,
      to: afterPrice,
      tone: gainTone(gain.price_usd),
    },
    {
      name: GAIN_LABELS.fourcp,
      shown: formatSignedUsdWhole(gain.fourcp_usd),
      from: afterPrice,
      to: end,
      tone: gainTone(gain.fourcp_usd),
    },
    {
      name: winner.label,
      shown: formatUsdWhole(winner.net_profit_usd),
      from: 0,
      to: end,
      tone: "accent",
    },
  ];
}

function scale(bars: readonly Bar[]): (value: number) => number {
  const ends = bars.flatMap((bar) => [bar.from, bar.to]);
  const low = Math.min(0, ...ends);
  const span = Math.max(0, ...ends) - low || 1;
  return (value) => ((value - low) / span) * 100;
}

const PLOT_HEIGHT_PX = 180;

export function GainBridge({
  baseline,
  winner,
}: {
  baseline: Strategy;
  winner: Strategy;
}) {
  const bars = bridgeBars(baseline, winner);
  const percent = scale(bars);
  const summary = bars.map((bar) => `${bar.name} ${bar.shown}`).join(", ");
  return (
    <Stack gap="md">
      <Title order={3}>{BRIDGE_TITLE}</Title>
      <SimpleGrid
        cols={4}
        spacing="sm"
        role="img"
        aria-label={summary}
        h={PLOT_HEIGHT_PX + 24}
        pt={24}
        style={{ borderBottom: "1px solid var(--ror-line)" }}
      >
        {bars.map((bar) => {
          const bottom = percent(Math.min(bar.from, bar.to));
          const top = percent(Math.max(bar.from, bar.to));
          return (
            <Box key={bar.name} pos="relative" h={PLOT_HEIGHT_PX}>
              <Text
                size="xs"
                fw={500}
                ta="center"
                pos="absolute"
                left={0}
                right={0}
                style={{ bottom: `calc(${String(top)}% + 4px)` }}
              >
                {bar.shown}
              </Text>
              <Box
                data-tone={bar.tone}
                pos="absolute"
                left="50%"
                w="min(64px, 100%)"
                bg={TONE_COLORS[bar.tone]}
                style={{
                  bottom: `${String(bottom)}%`,
                  height: `max(2px, ${String(top - bottom)}%)`,
                  transform: "translateX(-50%)",
                  borderRadius: 4,
                }}
              />
            </Box>
          );
        })}
      </SimpleGrid>
      <SimpleGrid cols={4} spacing="sm">
        {bars.map((bar) => (
          <Text
            key={bar.name}
            size="xs"
            ta="center"
            c="var(--ror-text-secondary)"
          >
            {bar.name}
          </Text>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
