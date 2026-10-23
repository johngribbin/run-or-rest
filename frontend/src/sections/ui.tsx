import { Paper, Text } from "@mantine/core";
import type { ReactNode } from "react";

export function Panel({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <Paper
      component="section"
      aria-label={label}
      withBorder
      p="xl"
      bg="var(--ror-surface)"
      style={{ borderColor: "var(--ror-line)" }}
    >
      {children}
    </Paper>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      component="p"
      m={0}
      size="xs"
      fw={500}
      tt="uppercase"
      c="dimmed"
      style={{ letterSpacing: "0.04em" }}
    >
      {children}
    </Text>
  );
}
