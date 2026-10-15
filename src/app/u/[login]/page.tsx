import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { CompositionBar, TOKEN_TYPES, TokenLegend } from "@/components/composition-bar";
import { formatDay, formatTokens, formatWeekday, shortModel } from "@/lib/format";
import { profile, type Profile } from "@/lib/queries";

const TOOL_NAMES: Record<string, string> = { claude: "Claude Code", codex: "Codex", copilot: "Copilot" };

export async function generateMetadata({ params }: PageProps<"/u/[login]">) {
  const { login } = await params;
  return { title: decodeURIComponent(login) };
}

export default function ProfilePage({ params }: PageProps<"/u/[login]">) {
  return (
    <div className="space-y-10">
      <Link href="/" className="inline-block text-sm text-muted hover:text-fg">
        ← Leaderboard
      </Link>
      <Suspense fallback={<div className="h-64 rounded-lg border border-line bg-card" aria-hidden />}>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

async function Profile({ params }: { params: PageProps<"/u/[login]">["params"] }) {
  const { login } = await params;
  const p = await profile(decodeURIComponent(login));
  if (!p) notFound();

  const last30 = p.daily.reduce((s, d) => s + d.total, 0);
  const maxDay = Math.max(...p.daily.map((d) => d.total), 1);
  const maxModel = p.models[0]?.total ?? 0;

  return (
    <>
      <section className="flex flex-wrap items-center gap-4">
        <Avatar src={p.avatarUrl} login={p.login} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{p.login}</h1>
          <p className="text-sm text-muted">
            <a href={`https://github.com/${p.login}`} className="hover:text-fg">
              github.com/{p.login}
            </a>
            {p.allTime.firstDay && <> · data since {formatDay(p.allTime.firstDay)}</>}
            {p.allTime.devices > 1 && <> · {p.allTime.devices} machines</>}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rank, 30 days" value={p.rank30 ? `#${p.rank30}` : "–"} />
        <Stat label="Last 30 days" value={formatTokens(last30)} />
        <Stat label="All time" value={formatTokens(p.allTime.total)} />
        <Stat label="Active days" value={String(p.allTime.activeDays)} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Last 30 days</h2>
          <ul className="flex gap-4 text-xs text-muted">
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-claude" /> Claude Code
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-codex" /> Codex
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-copilot" /> Copilot
            </li>
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="flex h-40 items-end gap-[3px]">
            {p.daily.map((d) => (
              <div
                key={d.day}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${formatDay(d.day)}: ${formatTokens(d.total)}`}
              >
                <div className="w-full rounded-t-[2px] bg-copilot" style={{ height: `${(d.copilot / maxDay) * 100}%` }} />
                <div className="w-full bg-codex" style={{ height: `${(d.codex / maxDay) * 100}%` }} />
                <div
                  className="w-full bg-claude"
                  style={{ height: `${(d.claude / maxDay) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="num mt-2 flex justify-between text-xs text-muted">
            <span>{formatDay(p.daily[0].day)}</span>
            <span>peak {formatTokens(maxDay)}</span>
            <span>{formatDay(p.daily[p.daily.length - 1].day)}</span>
          </div>
        </div>
      </section>

      <DailyReport daily={p.daily} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Models, all time</h2>
          <TokenLegend />
        </div>
        <ul className="divide-y divide-line rounded-lg border border-line bg-card">
          {p.models.map((m) => (
            <li
              key={m.tool + m.model}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,16rem)_1fr_5rem]"
            >
              <span className="min-w-0">
                <span className="num block truncate text-sm">{shortModel(m.model)}</span>
                <span className="block text-xs text-muted">{TOOL_NAMES[m.tool] ?? m.tool}</span>
              </span>
              <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                <CompositionBar totals={m} max={maxModel} />
              </span>
              <span className="num col-start-2 row-start-1 text-right text-sm font-semibold sm:col-start-auto sm:row-start-auto">
                {formatTokens(m.total)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOKEN_TYPES.map((t) => (
            <Stat key={t.key} label={t.label} value={formatTokens(p.allTime[t.key])} />
          ))}
        </dl>
      </section>
    </>
  );
}

const REPORT_TOOLS = [
  { key: "claude", label: "Claude Code", color: "bg-claude" },
  { key: "codex", label: "Codex", color: "bg-codex" },
  { key: "copilot", label: "Copilot", color: "bg-copilot" },
] as const;

// DailyReport lists the days with tokens, newest first. A tool gets a column
// only if this person used it in the 30 days.
function DailyReport({ daily }: { daily: Profile["daily"] }) {
  const days = daily.filter((d) => d.total > 0).reverse();
  const tools = REPORT_TOOLS.filter((t) => days.some((d) => d[t.key] > 0));
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Daily report</h2>
        <span className="text-xs text-muted">
          {days.length} active {days.length === 1 ? "day" : "days"} in the last 30 · rank is among everyone that day
        </span>
      </div>
      {days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          No tokens in the last 30 days.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="num w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-normal">Day</th>
                {tools.map((t) => (
                  <th key={t.key} className="px-3 py-2.5 text-right font-normal">
                    <span className={`mr-1.5 inline-block size-2 rounded-sm ${t.color}`} />
                    {t.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-normal">Total</th>
                <th className="px-3 py-2.5 text-right font-normal">Output</th>
                <th className="px-3 py-2.5 text-right font-normal">Rank</th>
                <th className="px-4 py-2.5 font-normal">Top model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {days.map((d) => (
                <tr key={d.day}>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatWeekday(d.day)}</td>
                  {tools.map((t) => (
                    <td key={t.key} className={`px-3 py-2.5 text-right ${d[t.key] ? "" : "text-muted"}`}>
                      {d[t.key] ? formatTokens(d[t.key]) : "–"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-semibold">{formatTokens(d.total)}</td>
                  <td className="px-3 py-2.5 text-right text-muted">{formatTokens(d.output)}</td>
                  <td className={`whitespace-nowrap px-3 py-2.5 text-right ${d.rank === 1 ? "font-semibold text-gold" : ""}`}>
                    {d.rank ? (
                      <>
                        #{d.rank}
                        <span className="text-muted"> / {d.people}</span>
                      </>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="max-w-48 truncate px-4 py-2.5 text-muted">{d.topModel ? shortModel(d.topModel) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
