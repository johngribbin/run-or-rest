import { CHART_TIME_ZONE } from "../config.ts";

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: CHART_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const found = parts.find((item) => item.type === type);
  if (found === undefined) {
    throw new Error(`No ${type} in ${CHART_TIME_ZONE} time`);
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
