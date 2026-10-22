import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { App } from "./App.tsx";

it("shows the page title and subtitle", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Run or Rest" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "A transparent ERCOT curtailment backtest for bitcoin miners",
    ),
  ).toBeInTheDocument();
});
