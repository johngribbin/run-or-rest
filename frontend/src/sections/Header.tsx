import {
  Anchor,
  Box,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  APP_SUBTITLE,
  APP_TITLE,
  ASSUMPTIONS_HEADING,
  ASSUMPTIONS_ID,
} from "../config.ts";

export function Header({
  onShowAssumptions,
}: {
  onShowAssumptions?: (() => void) | undefined;
}) {
  return (
    <Box
      component="header"
      style={{ borderBottom: "1px solid var(--ror-line)" }}
    >
      <Container size="lg" py="md">
        <Group justify="space-between" align="center" gap="md">
          <Stack gap={0}>
            <Title order={1}>{APP_TITLE}</Title>
            <Text size="xs" c="dimmed">
              {APP_SUBTITLE}
            </Text>
          </Stack>
          {onShowAssumptions === undefined ? null : (
            <Anchor
              href={`#${ASSUMPTIONS_ID}`}
              size="xs"
              c="var(--ror-text-secondary)"
              onClick={(event) => {
                event.preventDefault();
                onShowAssumptions();
              }}
            >
              {ASSUMPTIONS_HEADING}
              <span aria-hidden="true"> ↓</span>
            </Anchor>
          )}
        </Group>
      </Container>
    </Box>
  );
}
