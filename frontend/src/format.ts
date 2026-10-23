import {
  BTC_DISPLAY_PLACES,
  DIFFICULTY_UNIT,
  HASHPRICE_UNIT,
  HOURS_SUMMARY_PLACES,
  MINUS_SIGN,
  PLUS_SIGN,
  RATIO_PERCENT_PLACES,
  SATS_DECIMAL_PLACES,
  THOUSANDS_SEPARATOR,
} from "./config.ts";

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;
const CENTS = 2;
const PERCENT_SHIFT = 2;

function grouped(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
}

function parts(value: string): {
  sign: string;
  whole: string;
  fraction: string;
} {
  const match = DECIMAL.exec(value);
  if (match === null) {
    throw new Error(`Not a decimal string: ${value}`);
  }
  const [, sign = "", whole = "", fraction = ""] = match;
  return { sign: sign === "-" ? MINUS_SIGN : "", whole, fraction };
}

function joined(whole: string, fraction: string): string {
  return fraction === "" ? grouped(whole) : `${grouped(whole)}.${fraction}`;
}

export function formatDecimal(value: string): string {
  const { sign, whole, fraction } = parts(value);
  return `${sign}${joined(whole, fraction)}`;
}

export function formatUsd(value: string): string {
  const { sign, whole, fraction } = parts(value);
  return `${sign}$${joined(whole, fraction.padEnd(CENTS, "0"))}`;
}

export function formatPrice(value: string): string {
  return `${formatUsd(value)}/MWh`;
}

export function formatPercent(value: string): string {
  const { sign, whole, fraction } = parts(value);
  const digits = `${whole}${fraction.padEnd(PERCENT_SHIFT, "0")}`;
  const point = whole.length + PERCENT_SHIFT;
  const percentWhole = digits.slice(0, point).replace(/^0+(?=\d)/, "");
  return `${sign}${joined(percentWhole, digits.slice(point))}%`;
}

export function formatInteger(value: number): string {
  return grouped(String(value));
}

function roundedHalfEven(value: string, places: number): string {
  const match = DECIMAL.exec(value);
  if (match === null) {
    throw new Error(`Not a decimal string: ${value}`);
  }
  const [, sign = "", whole = "", fraction = ""] = match;
  const padded = fraction.padEnd(places + 1, "0");
  const kept = BigInt(`${whole}${padded.slice(0, places)}`);
  const rest = padded.slice(places);
  const half = "5".padEnd(rest.length, "0");
  const roundsUp = rest > half || (rest === half && kept % 2n === 1n);
  const digits = String(roundsUp ? kept + 1n : kept).padStart(places + 1, "0");
  const shownSign = /^0+$/.test(digits) ? "" : sign;
  const cut = digits.length - places;
  return places === 0
    ? `${shownSign}${digits}`
    : `${shownSign}${digits.slice(0, cut)}.${digits.slice(cut)}`;
}

export function formatUsdWhole(value: string): string {
  const { sign, whole } = parts(roundedHalfEven(value, 0));
  return `${sign}$${grouped(whole)}`;
}

export function formatSignedUsdWhole(value: string): string {
  const shown = formatUsdWhole(value);
  return shown.startsWith(MINUS_SIGN) || shown === "$0"
    ? shown
    : `${PLUS_SIGN}${shown}`;
}

export function formatBtc(sats: number): string {
  const digits = String(sats).padStart(SATS_DECIMAL_PLACES + 1, "0");
  const cut = digits.length - SATS_DECIMAL_PLACES;
  const btc = `${digits.slice(0, cut)}.${digits.slice(cut)}`;
  return formatDecimal(roundedHalfEven(btc, BTC_DISPLAY_PLACES));
}

export function formatHoursSummary(value: string): string {
  return formatDecimal(roundedHalfEven(value, HOURS_SUMMARY_PLACES));
}

function shiftedPoint(value: string, power: number): string {
  const match = DECIMAL.exec(value);
  if (match === null) {
    throw new Error(`Not a decimal string: ${value}`);
  }
  const [, sign = "", whole = "", fraction = ""] = match;
  const point = whole.length + power;
  const digits = `${"0".repeat(Math.max(0, -point))}${whole}${fraction}`;
  const padded = digits.padEnd(Math.max(point, 0), "0");
  const cut = Math.max(point, 0);
  const integer = padded.slice(0, cut).replace(/^0+(?=\d)/, "") || "0";
  const rest = padded.slice(cut);
  return rest === "" ? `${sign}${integer}` : `${sign}${integer}.${rest}`;
}

export function formatRatioPercent(value: string): string {
  const percent = roundedHalfEven(
    shiftedPoint(value, PERCENT_SHIFT),
    RATIO_PERCENT_PLACES,
  );
  return `${formatDecimal(percent)}%`;
}

export function formatSignedRatioPercent(value: string): string {
  const shown = formatRatioPercent(value);
  return shown.startsWith(MINUS_SIGN) || /^0(\.0+)?%$/.test(shown)
    ? shown
    : `${PLUS_SIGN}${shown}`;
}

export function formatDifficulty(value: string): string {
  const scaled = shiftedPoint(value, -DIFFICULTY_UNIT.power);
  return `${formatDecimal(roundedHalfEven(scaled, DIFFICULTY_UNIT.places))} ${DIFFICULTY_UNIT.suffix}`;
}

export function formatHashprice(value: string): string {
  return `${formatUsd(value)}${HASHPRICE_UNIT}`;
}
