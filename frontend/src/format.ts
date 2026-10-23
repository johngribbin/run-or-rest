import { MINUS_SIGN, THOUSANDS_SEPARATOR } from "./config.ts";

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

export function formatHours(value: string): string {
  return formatDecimal(value);
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
