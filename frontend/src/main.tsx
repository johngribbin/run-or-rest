import "@mantine/core/styles.css";
import "./theme/global.css";
import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AppProviders } from "./theme/AppProviders.tsx";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Missing #root element in index.html");
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

createRoot(root).render(
  <StrictMode>
    <AppProviders client={queryClient}>
      <App />
    </AppProviders>
  </StrictMode>,
);
