import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  test: {
    retry: 0,
    passWithNoTests: false,
    projects: [
      {
        extends: true,
        test: {
          name: "web",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["src/test-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "tools",
          include: ["tools/**/*.test.ts"],
          exclude: ["tools/canaries/**"],
          environment: "node",
          testTimeout: 60_000,
        },
      },
    ],
  },
});
