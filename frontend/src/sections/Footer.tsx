import { Anchor, Group, Text } from "@mantine/core";
import {
  COIN_METRICS_LICENCE_URL,
  COIN_METRICS_URL,
  GRID_STATUS_URL,
} from "../config.ts";

export function Footer() {
  return (
    <Group component="footer" gap="xl" c="dimmed">
      <Text size="xs">
        <Anchor href={GRID_STATUS_URL} c="var(--ror-text-secondary)" inherit>
          Data provided by Grid Status
        </Anchor>
      </Text>
      <Text size="xs">
        BTC price data from{" "}
        <Anchor href={COIN_METRICS_URL} c="var(--ror-text-secondary)" inherit>
          Coin Metrics
        </Anchor>
        , licensed under{" "}
        <Anchor
          href={COIN_METRICS_LICENCE_URL}
          c="var(--ror-text-secondary)"
          inherit
        >
          CC BY-NC 4.0
        </Anchor>
        .
      </Text>
    </Group>
  );
}
