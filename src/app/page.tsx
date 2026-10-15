import { Suspense } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CompositionBar, TokenLegend } from "@/components/composition-bar";
import { ModelSelect } from "@/components/model-select";
import { formatDay, formatTokens, shortModel } from "@/lib/format";
import {
  boardSummary,
  leaderboard,
  modelList,
  parseFilters,
  RANGES,
  SORTS,
  TOOLS,
  type Filters,
  type Range,
  type Sort,
} from "@/lib/queries";

// Where people get a tokenstat build that has `login` and `submit`. Change it
// to the upstream install once the feature is merged there.
const INSTALL = "git clone https://github.com/mberrishdev/tokenstat && cd tokenstat && go install .";

const RANGE_LABELS: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" };
const TOOL_LABELS = { all: "All tools", claude: "Claude Code", codex: "Codex", copilot: "Copilot" } as const;

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who burns the most tokens?</h1>
        <p className="max-w-2xl text-muted">
          Claude Code, Codex, and GitHub Copilot CLI token totals from{" "}
          <a className="underline decoration-line underline-offset-4 hover:text-fg" href="https://github.com/tornikegomareli/tokenstat">
            tokenstat
          </a>
          , which reads the session logs on each machine. Run one command to join.
        </p>
      </section>

      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>

      <Join />
    </div>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  let data;
  try {
    data = await Promise.all([leaderboard(filters), boardSummary(filters), modelList()]);
  } catch (err) {
    console.error(err);
    return (
      <p className="rounded-lg border border-line bg-card p-6 text-sm text-muted">
        The leaderboard database is not reachable. If you are setting this up, check <code className="num">DATABASE_URL</code>{" "}
        and run <code className="num">npm run db:migrate</code>.
      </p>
    );
  }
  const [rows, summary, models] = data;
  const max = rows[0] ? sortValue(rows[0], filters.sort) : 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Chips filters={filters} name="range" options={Object.keys(RANGES) as Range[]} labels={RANGE_LABELS} />
          <Chips filters={filters} name="tool" options={TOOLS} labels={TOOL_LABELS} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModelSelect models={models} value={filters.model} />
          <Chips filters={filters} name="sort" options={Object.keys(SORTS) as Sort[]} labels={SORTS} />
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted">
        <p>
          <span className="num text-fg">{summary.people}</span> {summary.people === 1 ? "person" : "people"} ·{" "}
          <span className="num text-fg">{formatTokens(summary.total)}</span> tokens
        </p>
        <TokenLegend />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">
          No one has submitted for this filter yet.{" "}
          <Link className="underline underline-offset-4" href="#join">
            Be the first.
          </Link>
        </p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {rows.map((r, i) => (
            <li key={r.login}>
              <Link
                href={`/u/${encodeURIComponent(r.login)}`}
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-3 hover:bg-line/30 sm:grid-cols-[2.5rem_minmax(0,14rem)_1fr_6rem] sm:px-4"
              >
                <span className={`num text-right text-sm ${i < 3 ? "font-semibold text-gold" : "text-muted"}`}>{i + 1}</span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar src={r.avatarUrl} login={r.login} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.login}</span>
                    <span className="num block truncate text-xs text-muted">
                      {shortModel(r.topModel)} · {r.activeDays}d active
                    </span>
                  </span>
                </span>
                <span className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <CompositionBar totals={r} max={max} />
                </span>
                <span className="num col-start-3 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
                  <span className="block text-sm font-semibold">{formatTokens(sortValue(r, filters.sort))}</span>
                  <span className="block text-xs text-muted">{formatDay(r.lastDay)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function sortValue(r: { total: number; output: number; input: number; cacheWrite: number }, sort: Sort): number {
  if (sort === "output") return r.output;
  if (sort === "fresh") return r.input + r.output + r.cacheWrite;
  return r.total;
}

function hrefWith(filters: Filters, change: Partial<Filters>): string {
  const f = { ...filters, ...change };
  const p = new URLSearchParams();
  if (f.range !== "30d") p.set("range", f.range);
  if (f.tool !== "all") p.set("tool", f.tool);
  if (f.model) p.set("model", f.model);
  if (f.sort !== "total") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

function Chips<K extends "range" | "tool" | "sort">({
  filters,
  name,
  options,
  labels,
}: {
  filters: Filters;
  name: K;
  options: readonly Filters[K][];
  labels: Record<Filters[K] & string, string>;
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-card p-0.5 text-xs">
      {options.map((o) => {
        const active = filters[name] === o;
        return (
          <Link
            key={String(o)}
            href={hrefWith(filters, { [name]: o })}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`rounded px-2.5 py-1.5 ${active ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
          >
            {labels[o as Filters[K] & string]}
          </Link>
        );
      })}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-8 w-80 max-w-full rounded-md bg-line/50" />
      <div className="divide-y divide-line rounded-lg border border-line bg-card">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="size-7 rounded-full bg-line/60" />
            <div className="h-3 w-32 rounded bg-line/60" />
            <div className="h-2 flex-1 rounded bg-line/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Join() {
  return (
    <section id="join" className="scroll-mt-8 space-y-4 rounded-lg border border-line bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Join the board</h2>
      <ol className="space-y-4 text-sm">
        <Step n={1} text="Install tokenstat with leaderboard support:">
          {INSTALL}
        </Step>
        <Step n={2} text="Sign in with GitHub. It prints a code to enter on github.com:">
          tokenstat login
        </Step>
        <Step n={3} text="Send your daily totals. Run it again any time to update:">
          tokenstat submit
        </Step>
      </ol>
      <p className="text-xs text-muted">
        Run <code className="num">tokenstat submit -dry-run</code> first to see exactly what gets sent.
      </p>
    </section>
  );
}

function Step({ n, text, children }: { n: number; text: string; children: React.ReactNode }) {
  return (
    <li className="space-y-1.5">
      <p className="text-muted">
        <span className="num mr-2 text-fg">{n}.</span>
        {text}
      </p>
      <pre className="num overflow-x-auto rounded-md border border-line bg-bg px-3 py-2 text-xs">{children}</pre>
    </li>
  );
}
