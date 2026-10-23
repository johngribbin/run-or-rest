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

const centralYear = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
});

export function formatCentralYear(utc: string): string {
  return centralYear.format(new Date(utc));
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

const peakDay = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const shortMonth = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
});

export function formatPeakDay(utc: string): string {
  return peakDay.format(new Date(utc));
}

export interface ChartSpan {
  label: string;
  from: number;
  to: number;
}

export function centralMonths(startUtc: string, endUtc: string): ChartSpan[] {
  const end = chartTime(endUtc);
  const spans: ChartSpan[] = [];
  let from = chartTime(startUtc);
  while (from < end) {
    const moment = new Date(from);
    const to = Math.min(
      end,
      Date.UTC(moment.getUTCFullYear(), moment.getUTCMonth() + 1, 1),
    );
    spans.push({ label: shortMonth.format(moment), from, to });
    from = to;
  }
  return spans;
}

const utcDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

export function formatUtcDay(dateUtc: string): string {
  return utcDay.format(new Date(`${dateUtc}T00:00:00Z`));
}
