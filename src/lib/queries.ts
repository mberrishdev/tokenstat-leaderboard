import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

// Every query is cached for a minute and tagged "board"; a submit
// revalidates the tag.
function cached() {
  cacheLife("minutes");
  cacheTag("board");
}

// plain copies postgres.js result rows into plain objects, which the cache
// can serialize.
function plain<T extends object>(rows: readonly T[]): T[] {
  return rows.map((r) => ({ ...r }));
}

export const RANGES = { "7d": 7, "30d": 30, "90d": 90, all: null } as const;
export type Range = keyof typeof RANGES;
export const TOOLS = ["all", "claude", "codex", "copilot"] as const;
export type ToolFilter = (typeof TOOLS)[number];
export const SORTS = { total: "All tokens", output: "Output", fresh: "Without cache reads" } as const;
export type Sort = keyof typeof SORTS;

export type Filters = { range: Range; tool: ToolFilter; model: string | null; sort: Sort };

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const model = typeof sp.model === "string" && sp.model.length <= 100 ? sp.model : null;
  return {
    range: pick(sp.range, Object.keys(RANGES) as Range[], "30d"),
    tool: pick(sp.tool, TOOLS, "all"),
    model,
    sort: pick(sp.sort, Object.keys(SORTS) as Sort[], "total"),
  };
}

export type Totals = { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
export type BoardRow = Totals & {
  login: string;
  avatarUrl: string | null;
  activeDays: number;
  lastDay: string;
  topModel: string;
};

// Postgres sums of bigint come back as strings; the values fit in a double.
const totalsCols = (sql: ReturnType<typeof db>) => sql`
  sum(d.input)::float8 as input, sum(d.output)::float8 as output,
  sum(d.cache_read)::float8 as "cacheRead", sum(d.cache_write)::float8 as "cacheWrite",
  sum(d.input + d.output + d.cache_read + d.cache_write)::float8 as total`;

function where(sql: ReturnType<typeof db>, f: Omit<Filters, "sort">) {
  const days = RANGES[f.range];
  return sql`
    where true
    ${days ? sql`and d.day > current_date - ${days}::int` : sql``}
    ${f.tool !== "all" ? sql`and d.tool = ${f.tool}` : sql``}
    ${f.model ? sql`and d.model = ${f.model}` : sql``}`;
}

export async function leaderboard(f: Filters, limit = 100): Promise<BoardRow[]> {
  "use cache";
  cached();
  const sql = db();
  const order = {
    total: sql`total`,
    output: sql`output`,
    fresh: sql`(sum(d.input + d.output + d.cache_write))`,
  }[f.sort];
  const rows = await sql<BoardRow[]>`
    select u.login, u.avatar_url as "avatarUrl", ${totalsCols(sql)},
      count(distinct d.day)::int as "activeDays", max(d.day)::text as "lastDay",
      (select m.model from usage_daily m
        where m.user_id = u.id
          ${RANGES[f.range] ? sql`and m.day > current_date - ${RANGES[f.range]}::int` : sql``}
          ${f.tool !== "all" ? sql`and m.tool = ${f.tool}` : sql``}
        group by m.model order by sum(m.input + m.output + m.cache_read + m.cache_write) desc limit 1) as "topModel"
    from usage_daily d join users u on u.id = d.user_id
    ${where(sql, f)}
    group by u.id
    having sum(d.input + d.output + d.cache_read + d.cache_write) > 0
    order by ${order} desc, u.login
    limit ${limit}`;
  return plain(rows);
}

export async function boardSummary(f: Filters): Promise<{ people: number; total: number }> {
  "use cache";
  cached();
  const sql = db();
  const [row] = await sql<{ people: number; total: number }[]>`
    select count(distinct d.user_id)::int as people,
      coalesce(sum(d.input + d.output + d.cache_read + d.cache_write), 0)::float8 as total
    from usage_daily d ${where(sql, f)}`;
  return { ...row };
}

export async function modelList(): Promise<string[]> {
  "use cache";
  cached();
  const sql = db();
  const rows = await sql<{ model: string }[]>`
    select model from usage_daily
    where day > current_date - 90
    group by model order by sum(input + output + cache_read + cache_write) desc limit 40`;
  return rows.map((r) => r.model);
}

export type Profile = {
  login: string;
  avatarUrl: string | null;
  joined: string;
  lastSubmit: string | null;
  allTime: Totals & { activeDays: number; firstDay: string | null; devices: number };
  rank30: number | null;
  // The last 30 days, oldest first. rank is among everyone with tokens
  // that day; days without tokens have rank null.
  daily: (Totals & {
    day: string;
    claude: number;
    codex: number;
    copilot: number;
    rank: number | null;
    people: number;
    topModel: string | null;
  })[];
  models: (Totals & { model: string; tool: string })[];
};

export async function profile(login: string): Promise<Profile | null> {
  "use cache";
  cached();
  const sql = db();
  const [user] = await sql<{ id: string; login: string; avatarUrl: string | null; joined: string; lastSubmit: string | null }[]>`
    select id::text, login, avatar_url as "avatarUrl", created_at::text as joined, last_submit_at::text as "lastSubmit"
    from users where lower(login) = lower(${login})`;
  if (!user) return null;

  const [allTime, rank, daily, models, dayRanks] = await Promise.all([
    sql<(Totals & { activeDays: number; firstDay: string | null; devices: number })[]>`
      select ${totalsCols(sql)}, count(distinct d.day)::int as "activeDays", min(d.day)::text as "firstDay",
        count(distinct d.device)::int as devices
      from usage_daily d where d.user_id = ${user.id}`,
    sql<{ rank: number }[]>`
      select rank::int from (
        select user_id, rank() over (order by sum(input + output + cache_read + cache_write) desc) as rank
        from usage_daily where day > current_date - 30 group by user_id
      ) r where user_id = ${user.id}`,
    sql<(Totals & { day: string; claude: number; codex: number; copilot: number })[]>`
      select g.day::date::text as day,
        coalesce(sum(d.input), 0)::float8 as input, coalesce(sum(d.output), 0)::float8 as output,
        coalesce(sum(d.cache_read), 0)::float8 as "cacheRead", coalesce(sum(d.cache_write), 0)::float8 as "cacheWrite",
        coalesce(sum(d.input + d.output + d.cache_read + d.cache_write), 0)::float8 as total,
        coalesce(sum(d.input + d.output + d.cache_read + d.cache_write) filter (where d.tool = 'claude'), 0)::float8 as claude,
        coalesce(sum(d.input + d.output + d.cache_read + d.cache_write) filter (where d.tool = 'codex'), 0)::float8 as codex,
        coalesce(sum(d.input + d.output + d.cache_read + d.cache_write) filter (where d.tool = 'copilot'), 0)::float8 as copilot
      from generate_series(current_date - 29, current_date, interval '1 day') g(day)
      left join usage_daily d on d.day = g.day::date and d.user_id = ${user.id}
      group by g.day order by g.day`,
    sql<(Totals & { model: string; tool: string })[]>`
      select d.model, d.tool, ${totalsCols(sql)}
      from usage_daily d where d.user_id = ${user.id}
      group by d.model, d.tool order by total desc limit 20`,
    sql<{ day: string; rank: number; people: number; topModel: string | null }[]>`
      with per_day as (
        select user_id, day, sum(input + output + cache_read + cache_write) as total
        from usage_daily where day > current_date - 30
        group by user_id, day having sum(input + output + cache_read + cache_write) > 0
      ), ranked as (
        select user_id, day, rank() over (partition by day order by total desc)::int as rank,
          count(*) over (partition by day)::int as people
        from per_day
      ), top_model as (
        select distinct on (day) day, model from usage_daily
        where user_id = ${user.id} and day > current_date - 30
        group by day, model order by day, sum(input + output + cache_read + cache_write) desc
      )
      select r.day::text, r.rank, r.people, t.model as "topModel"
      from ranked r left join top_model t on t.day = r.day
      where r.user_id = ${user.id}`,
  ]);
  const byDay = new Map(dayRanks.map((r) => [r.day, r]));

  return {
    login: user.login,
    avatarUrl: user.avatarUrl,
    joined: user.joined,
    lastSubmit: user.lastSubmit,
    allTime: { ...allTime[0] },
    rank30: rank[0]?.rank ?? null,
    daily: daily.map((d) => {
      const r = byDay.get(d.day);
      return { ...d, rank: r?.rank ?? null, people: r?.people ?? 0, topModel: r?.topModel ?? null };
    }),
    models: plain(models),
  };
}
