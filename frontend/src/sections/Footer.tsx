import { Anchor, Stack, Text } from "@mantine/core";
import {
  COIN_METRICS_LICENCE_URL,
  COIN_METRICS_URL,
  GRID_STATUS_URL,
} from "../config.ts";

export function Footer() {
  return (
    <Stack component="footer" gap={4}>
      <Text size="sm">
        <Anchor href={GRID_STATUS_URL}>Data provided by Grid Status</Anchor>
      </Text>
      <Text size="sm">
        BTC price data from{" "}
        <Anchor href={COIN_METRICS_URL}>Coin Metrics</Anchor>, licensed under{" "}
        <Anchor href={COIN_METRICS_LICENCE_URL}>CC BY-NC 4.0</Anchor>.
      </Text>
    </Stack>
  );
}
