import { cacheLife } from "next/cache";

const REPO = "tornikegomareli/tokenstat";

// stars reads the repo's star count from GitHub, at most once an hour: the
// API allows 60 requests an hour without a token. It returns null when
// GitHub does not answer, and the badge then shows no count.
async function stars(): Promise<number | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "tokenstat-leaderboard" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const { stargazers_count } = (await res.json()) as { stargazers_count?: unknown };
    return typeof stargazers_count === "number" ? stargazers_count : null;
  } catch {
    return null;
  }
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden fill="currentColor">
      <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
    </svg>
  );
}

// GitHubStars links to tokenstat on GitHub with its star count.
export async function GitHubStars() {
  const count = await stars();
  return (
    <a
      href={`https://github.com/${REPO}`}
      className="inline-flex items-center gap-2 rounded-md border border-line bg-card px-2.5 py-1 text-fg hover:border-muted"
      aria-label={count === null ? "tokenstat on GitHub" : `tokenstat on GitHub, ${count} stars`}
    >
      <GitHubMark />
      <span>tokenstat</span>
      {count !== null && (
        <span className="num inline-flex items-center gap-1 border-l border-line pl-2 text-muted">
          <StarIcon />
          {count.toLocaleString("en-US")}
        </span>
      )}
    </a>
  );
}
