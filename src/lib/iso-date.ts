const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateIsoRange(
  start: string,
  end: string,
): { ok: true } | { error: string } {
  if (!isIsoDate(start) || !isIsoDate(end)) {
    return { error: "Invalid date format" };
  }
  if (start > end) {
    return { error: "Start date is after end date" };
  }
  return { ok: true };
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function shiftIsoDate(iso: string, days: number): string {
  if (!isIsoDate(iso)) throw new Error(`Invalid ISO date: ${iso}`);
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(start: string, end: string): number {
  const range = validateIsoRange(start, end);
  if ("error" in range) return 1;
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startMs = Date.UTC(startYear, startMonth - 1, startDay);
  const endMs = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.max(1, Math.round((endMs - startMs) / DAY_MS));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
