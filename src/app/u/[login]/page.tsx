import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { CompositionBar, TOKEN_TYPES, TokenLegend } from "@/components/composition-bar";
import { formatDay, formatTokens, shortModel } from "@/lib/format";
import { profile } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/u/[login]">) {
  const { login } = await params;
  return { title: decodeURIComponent(login) };
}

export default function ProfilePage({ params }: PageProps<"/u/[login]">) {
  return (
    <div className="space-y-10">
      <Link href="/" className="text-sm text-muted hover:text-fg">
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
                <div className="w-full rounded-t-[2px] bg-codex" style={{ height: `${(d.codex / maxDay) * 100}%` }} />
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
                <span className="block text-xs text-muted">{m.tool === "codex" ? "Codex" : "Claude Code"}</span>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
