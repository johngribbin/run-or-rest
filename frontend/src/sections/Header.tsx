import { Box, Container, Stack, Text, Title } from "@mantine/core";
import { APP_SUBTITLE, APP_TITLE } from "../config.ts";

export function Header() {
  return (
    <Box
      component="header"
      style={{ borderBottom: "1px solid var(--ror-line)" }}
    >
      <Container size="lg" py="md">
        <Stack gap={0}>
          <Title order={1}>{APP_TITLE}</Title>
          <Text size="xs" c="dimmed">
            {APP_SUBTITLE}
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
