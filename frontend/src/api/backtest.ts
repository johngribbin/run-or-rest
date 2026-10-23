import { BACKTEST_PATH, THRESHOLD_PARAM } from "../config.ts";
import type { components } from "./schema.ts";

type Schemas = components["schemas"];
export type Backtest = Schemas["BacktestResponse"];
export type Strategy = Schemas["Strategy"];
export type StrategyId = Schemas["StrategyId"];
export type Decision = Schemas["Decision"];
export type SeriesPoint = Schemas["SeriesPoint"];
export type FourCp = Schemas["FourCp"];
export type Bitcoin = Schemas["Bitcoin"];
type Decisions = Schemas["Decisions"];

export class BacktestRequestError extends Error {}

type Members<T extends string> = { [K in T]: K };

const STRATEGY_ID_MEMBERS: Members<StrategyId> = {
  always_on: "always_on",
  strike_price: "strike_price",
  strike_peak_guard: "strike_peak_guard",
};
const DECISION_MEMBERS: Members<Decision> = { run: "run", off: "off" };
const STRATEGY_IDS = Object.values(STRATEGY_ID_MEMBERS);
const DECISIONS = Object.values(DECISION_MEMBERS);

export const BASELINE_STRATEGY_ID: StrategyId = "always_on";

function shapeError(path: string, expected: string): Error {
  return new BacktestRequestError(`Unexpected response: ${path} ${expected}`);
}

function object(value: unknown, path: string): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw shapeError(path, "is not an object");
  }
  return value;
}

function field(value: object, key: string): unknown {
  const found: unknown = Reflect.get(value, key);
  return found;
}

function text(value: object, key: string, path: string): string {
  const found = field(value, key);
  if (typeof found !== "string") {
    throw shapeError(`${path}.${key}`, "is not a string");
  }
  return found;
}

function nullableText(value: object, key: string, path: string): string | null {
  return field(value, key) === null ? null : text(value, key, path);
}

function integer(value: object, key: string, path: string): number {
  const found = field(value, key);
  if (typeof found !== "number" || !Number.isInteger(found)) {
    throw shapeError(`${path}.${key}`, "is not an integer");
  }
  return found;
}

function child(value: object, key: string, path: string): object {
  return object(field(value, key), `${path}.${key}`);
}

function list(value: object, key: string, path: string): object[] {
  const found: unknown = field(value, key);
  if (!Array.isArray(found)) {
    throw shapeError(`${path}.${key}`, "is not a list");
  }
  const items: unknown[] = found;
  return items.map((item, index) =>
    object(item, `${path}.${key}[${String(index)}]`),
  );
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: object,
  key: string,
  path: string,
): T {
  const found = text(value, key, path);
  const match = allowed.find((candidate) => candidate === found);
  if (match === undefined) {
    throw shapeError(`${path}.${key}`, `is not one of ${allowed.join(", ")}`);
  }
  return match;
}

function parseStrategy(value: object, path: string): Strategy {
  const gain = child(value, "gain_vs_always_on", path);
  const gainPath = `${path}.gain_vs_always_on`;
  return {
    id: oneOf(STRATEGY_IDS, value, "id", path),
    label: text(value, "label", path),
    revenue_usd: text(value, "revenue_usd", path),
    energy_cost_usd: text(value, "energy_cost_usd", path),
    transmission_usd: text(value, "transmission_usd", path),
    net_profit_usd: text(value, "net_profit_usd", path),
    mined_sats: integer(value, "mined_sats", path),
    hours_off: text(value, "hours_off", path),
    peaks_running: integer(value, "peaks_running", path),
    gain_vs_always_on: {
      price_usd: text(gain, "price_usd", gainPath),
      fourcp_usd: text(gain, "fourcp_usd", gainPath),
      total_usd: text(gain, "total_usd", gainPath),
    },
  };
}

function parseDecisions(value: object, path: string): Decisions {
  const decisions = child(value, "decisions", path);
  const decisionsPath = `${path}.decisions`;
  return {
    always_on: oneOf(DECISIONS, decisions, "always_on", decisionsPath),
    strike_price: oneOf(DECISIONS, decisions, "strike_price", decisionsPath),
    strike_peak_guard: oneOf(
      DECISIONS,
      decisions,
      "strike_peak_guard",
      decisionsPath,
    ),
  };
}

function parsePoint(value: object, path: string): SeriesPoint {
  return {
    interval_start_utc: text(value, "interval_start_utc", path),
    price_usd_per_mwh: text(value, "price_usd_per_mwh", path),
    breakeven_estimate_usd_per_mwh: text(
      value,
      "breakeven_estimate_usd_per_mwh",
      path,
    ),
    decisions: parseDecisions(value, path),
  };
}

function parseFourCp(body: object): FourCp {
  const fourcp = child(body, "fourcp", "body");
  return {
    charge_per_peak_usd: text(fourcp, "charge_per_peak_usd", "body.fourcp"),
    peaks: list(fourcp, "peaks", "body.fourcp").map((item, index) => {
      const path = `body.fourcp.peaks[${String(index)}]`;
      return {
        month: text(item, "month", path),
        interval_start_utc: text(item, "interval_start_utc", path),
        system_load_mw: text(item, "system_load_mw", path),
        price_usd_per_mwh: text(item, "price_usd_per_mwh", path),
        decisions: parseDecisions(item, path),
      };
    }),
  };
}

function parseBitcoin(body: object): Bitcoin {
  const bitcoin = child(body, "bitcoin", "body");
  return {
    daily: list(bitcoin, "daily", "body.bitcoin").map((item, index) => {
      const path = `body.bitcoin.daily[${String(index)}]`;
      return {
        date_utc: text(item, "date_utc", path),
        btc_price_usd: text(item, "btc_price_usd", path),
        difficulty: text(item, "difficulty", path),
        reward_per_block_sats: text(item, "reward_per_block_sats", path),
        fees_share: text(item, "fees_share", path),
        hashprice_usd_per_ph_day: text(item, "hashprice_usd_per_ph_day", path),
      };
    }),
    difficulty_adjustments: list(
      bitcoin,
      "difficulty_adjustments",
      "body.bitcoin",
    ).map((item, index) => {
      const path = `body.bitcoin.difficulty_adjustments[${String(index)}]`;
      return {
        start_utc: text(item, "start_utc", path),
        difficulty: text(item, "difficulty", path),
        change_ratio: nullableText(item, "change_ratio", path),
      };
    }),
  };
}

function parseHeader(
  body: object,
): Pick<Backtest, "period" | "controls" | "assumptions"> {
  const period = child(body, "period", "body");
  const threshold = child(
    child(body, "controls", "body"),
    "peak_guard_threshold",
    "body.controls",
  );
  const thresholdPath = "body.controls.peak_guard_threshold";
  const assumptions = child(body, "assumptions", "body");
  return {
    period: {
      start_utc: text(period, "start_utc", "body.period"),
      end_utc: text(period, "end_utc", "body.period"),
      settlement_point: text(period, "settlement_point", "body.period"),
    },
    controls: {
      peak_guard_threshold: {
        min: text(threshold, "min", thresholdPath),
        max: text(threshold, "max", thresholdPath),
        step: text(threshold, "step", thresholdPath),
        default: text(threshold, "default", thresholdPath),
      },
    },
    assumptions: {
      fleet_mw: text(assumptions, "fleet_mw", "body.assumptions"),
      efficiency_j_per_th: text(
        assumptions,
        "efficiency_j_per_th",
        "body.assumptions",
      ),
      pool_fee_rate: text(assumptions, "pool_fee_rate", "body.assumptions"),
      transmission_rate_usd_per_mw_year: text(
        assumptions,
        "transmission_rate_usd_per_mw_year",
        "body.assumptions",
      ),
      peak_guard_threshold: text(
        assumptions,
        "peak_guard_threshold",
        "body.assumptions",
      ),
    },
  };
}

function checkStrategyOrder(strategies: readonly Strategy[]): void {
  const found = strategies.map((strategy) => strategy.id).join(", ");
  const expected = STRATEGY_IDS.join(", ");
  if (found !== expected) {
    throw shapeError("body.strategies", `are ${found}, not ${expected}`);
  }
}

export function strategyById(backtest: Backtest, id: StrategyId): Strategy {
  const match = backtest.strategies.find((strategy) => strategy.id === id);
  if (match === undefined) {
    throw new BacktestRequestError(`No strategy ${id} in the response`);
  }
  return match;
}

export function parseBacktest(value: unknown): Backtest {
  const body = object(value, "body");
  const winner = child(body, "winner", "body");
  const quality = child(body, "data_quality", "body");
  const strategies = list(body, "strategies", "body").map((item, index) =>
    parseStrategy(item, `body.strategies[${String(index)}]`),
  );
  checkStrategyOrder(strategies);
  return {
    ...parseHeader(body),
    winner: {
      id: oneOf(STRATEGY_IDS, winner, "id", "body.winner"),
      advantage_over_always_on_usd: text(
        winner,
        "advantage_over_always_on_usd",
        "body.winner",
      ),
    },
    strategies,
    fourcp: parseFourCp(body),
    bitcoin: parseBitcoin(body),
    series: list(body, "series", "body").map((item, index) =>
      parsePoint(item, `body.series[${String(index)}]`),
    ),
    data_quality: {
      expected_intervals: integer(
        quality,
        "expected_intervals",
        "body.data_quality",
      ),
      missing_intervals: integer(
        quality,
        "missing_intervals",
        "body.data_quality",
      ),
    },
  };
}

function errorDetail(body: unknown, status: number): string {
  const detail =
    typeof body === "object" && body !== null
      ? field(body, "detail")
      : undefined;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const items: unknown[] = detail;
    const messages = items.flatMap((item) => {
      const message =
        typeof item === "object" && item !== null
          ? field(item, "msg")
          : undefined;
      return typeof message === "string" ? [message] : [];
    });
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  return `Request failed with status ${String(status)}`;
}

export function backtestUrl(threshold: string | null): string {
  if (threshold === null) {
    return BACKTEST_PATH;
  }
  return `${BACKTEST_PATH}?${new URLSearchParams({ [THRESHOLD_PARAM]: threshold }).toString()}`;
}

function errorBody(response: Response): Promise<unknown> {
  const type = response.headers.get("Content-Type") ?? "";
  return type.includes("application/json")
    ? response.json()
    : Promise.resolve(null);
}

export async function fetchBacktest(
  threshold: string | null,
  signal?: AbortSignal,
): Promise<Backtest> {
  const response = await fetch(backtestUrl(threshold), { signal });
  if (!response.ok) {
    const detail = errorDetail(await errorBody(response), response.status);
    throw new BacktestRequestError(detail);
  }
  const body: unknown = await response.json();
  return parseBacktest(body);
}
