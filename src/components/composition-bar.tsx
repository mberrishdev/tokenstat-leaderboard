import type { Totals } from "@/lib/queries";
import { formatTokens } from "@/lib/format";

export const TOKEN_TYPES = [
  { key: "cacheRead", label: "Cache read", color: "var(--t-cache-read)" },
  { key: "cacheWrite", label: "Cache write", color: "var(--t-cache-write)" },
  { key: "input", label: "Input", color: "var(--t-input)" },
  { key: "output", label: "Output", color: "var(--t-output)" },
] as const;

// CompositionBar shows a total as a bar scaled to `max`, split by token type.
export function CompositionBar({ totals, max }: { totals: Totals; max: number }) {
  const width = max > 0 ? Math.max((totals.total / max) * 100, 0.5) : 0;
  const title = TOKEN_TYPES.map((t) => `${t.label} ${formatTokens(totals[t.key])}`).join(" · ");
  return (
    <div className="h-2 w-full rounded-sm bg-line/40" title={title}>
      <div className="flex h-full overflow-hidden rounded-sm" style={{ width: `${width}%` }}>
        {TOKEN_TYPES.map((t) => (
          <div
            key={t.key}
            style={{ width: `${totals.total ? (totals[t.key] / totals.total) * 100 : 0}%`, background: t.color }}
          />
        ))}
      </div>
    </div>
  );
}

export function TokenLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {TOKEN_TYPES.map((t) => (
        <li key={t.key} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: t.color }} />
          {t.label}
        </li>
      ))}
    </ul>
  );
}
