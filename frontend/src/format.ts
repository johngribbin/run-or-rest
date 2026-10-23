import { MINUS_SIGN, THOUSANDS_SEPARATOR } from "./config.ts";

const DECIMAL = /^(-?)(\d+)(\.\d+)?$/;

function grouped(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
}

function parts(value: string): { negative: boolean; text: string } {
  const match = DECIMAL.exec(value);
  if (match === null) {
    throw new Error(`Not a decimal string: ${value}`);
  }
  const [, sign = "", whole = "", fraction = ""] = match;
  return { negative: sign === "-", text: `${grouped(whole)}${fraction}` };
}

export function formatUsd(value: string): string {
  const { negative, text } = parts(value);
  return `${negative ? MINUS_SIGN : ""}$${text}`;
}

export function formatPrice(value: string): string {
  return `${formatUsd(value)}/MWh`;
}

export function formatHours(value: string): string {
  const { negative, text } = parts(value);
  return `${negative ? MINUS_SIGN : ""}${text}`;
}

export function formatInteger(value: number): string {
  return grouped(String(value));
}
