import { Text, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import { TOOLTIP_WIDTH_PX } from "../config.ts";

export function Term({
  tooltip,
  children,
}: {
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip
      label={tooltip}
      multiline
      w={TOOLTIP_WIDTH_PX}
      withArrow
      events={{ hover: true, focus: true, touch: true }}
    >
      <Text
        span
        inherit
        tabIndex={0}
        style={{ textDecoration: "underline dotted", cursor: "help" }}
      >
        {children}
      </Text>
    </Tooltip>
  );
}
