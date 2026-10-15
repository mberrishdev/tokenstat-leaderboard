// Checks the rows that `tokenstat submit` sends.

export type DayRow = {
  day: string;
  tool: "claude" | "codex";
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  calls: number;
};

export const MAX_ROWS = 3000;
const MAX_TOKENS = 100_000_000_000; // per field, per row: far above any real day
const MAX_CALLS = 10_000_000;
const MAX_AGE_DAYS = 400;
const MODEL = /^[\x21-\x7e][\x20-\x7e]{0,99}$/; // printable ASCII, 1–100 chars
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function count(v: unknown, limit: number): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= limit;
}

// validateRows returns the rows, or an error that names the first bad row.
export function validateRows(body: unknown, now = new Date()): { rows: DayRow[] } | { error: string } {
  const days = (body as { days?: unknown } | null)?.days;
  if (!Array.isArray(days)) return { error: "days must be an array" };
  if (days.length === 0) return { error: "days is empty" };
  if (days.length > MAX_ROWS) return { error: `at most ${MAX_ROWS} rows per submit` };

  // Local days run from UTC−12 to UTC+14, so allow one day past today in UTC.
  const latest = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  const earliest = new Date(now.getTime() - MAX_AGE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const seen = new Set<string>();
  const rows: DayRow[] = [];

  for (const [i, r] of days.entries()) {
    const bad = (why: string) => ({ error: `row ${i}: ${why}` });
    if (typeof r !== "object" || r === null) return bad("not an object");
    const { day, tool, model, input, output, cacheRead, cacheWrite, calls } = r as Record<string, unknown>;
    if (typeof day !== "string" || !DAY.test(day) || Number.isNaN(Date.parse(day))) return bad("day must be YYYY-MM-DD");
    if (day > latest) return bad("day is in the future");
    if (day < earliest) return bad(`day is more than ${MAX_AGE_DAYS} days old`);
    if (tool !== "claude" && tool !== "codex") return bad("tool must be claude or codex");
    if (typeof model !== "string" || !MODEL.test(model)) return bad("model is not valid");
    for (const [name, v] of Object.entries({ input, output, cacheRead, cacheWrite })) {
      if (!count(v, MAX_TOKENS)) return bad(`${name} must be a whole number from 0 to ${MAX_TOKENS}`);
    }
    if (!count(calls, MAX_CALLS)) return bad("calls is not valid");
    const key = `${day}|${tool}|${model}`;
    if (seen.has(key)) return bad("duplicate day, tool, and model");
    seen.add(key);
    rows.push({ day, tool, model, input, output, cacheRead, cacheWrite, calls } as DayRow);
  }
  return { rows };
}
