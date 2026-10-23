import { DISPLAY_TIME_ZONE, DISPLAY_TIME_ZONE_LABEL } from "../config.ts";

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

const shownTime = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const periodDate = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatPeriod(startUtc: string, endUtc: string): string {
  const lastMoment = new Date(Date.parse(endUtc) - 1);
  return periodDate
    .formatRange(new Date(startUtc), lastMoment)
    .replace(/\s/g, " ");
}

export function formatCentralTime(utc: string): string {
  return `${shownTime.format(new Date(utc))} ${DISPLAY_TIME_ZONE_LABEL}`;
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const found = parts.find((item) => item.type === type);
  if (found === undefined) {
    throw new Error(`No ${type} in ${DISPLAY_TIME_ZONE} time`);
  }
  return Number(found.value);
}

export function chartTime(utc: string): number {
  const parts = wallClock.formatToParts(new Date(utc));
  return Date.UTC(
    part(parts, "year"),
    part(parts, "month") - 1,
    part(parts, "day"),
    part(parts, "hour"),
    part(parts, "minute"),
    part(parts, "second"),
  );
}

const peakMoment = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  hourCycle: "h23",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthName = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  month: "long",
});

export function formatPeakMoment(utc: string): string {
  return `${peakMoment.format(new Date(utc))} ${DISPLAY_TIME_ZONE_LABEL}`;
}

export function formatCentralMonth(utc: string): string {
  return monthName.format(new Date(utc));
}
