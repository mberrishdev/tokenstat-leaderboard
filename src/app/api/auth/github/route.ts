import { db } from "@/lib/db";
import { hashToken, jsonError, newToken } from "@/lib/auth";

type GitHubUser = { id: number; login: string; avatar_url: string };

// POST { githubToken } → { token, login }
//
// The CLI gets a GitHub token with the device flow and trades it here for a
// leaderboard token. GitHub's "check a token" API confirms that the token
// was issued to this OAuth app, then the GitHub token is revoked: the
// leaderboard never keeps it.
export async function POST(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return jsonError("GitHub OAuth is not configured on the server", 503);

  let githubToken: unknown;
  try {
    ({ githubToken } = await req.json());
  } catch {
    return jsonError("body must be JSON", 400);
  }
  if (typeof githubToken !== "string" || githubToken.length < 10 || githubToken.length > 255) {
    return jsonError("githubToken is missing", 400);
  }

  const appAuth = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const appTokenURL = `https://api.github.com/applications/${clientId}/token`;
  const headers = {
    Authorization: appAuth,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
  const check = await fetch(appTokenURL, {
    method: "POST",
    headers,
    body: JSON.stringify({ access_token: githubToken }),
  });
  if (check.status === 404 || check.status === 422) return jsonError("GitHub token is not valid for this app", 401);
  if (!check.ok) return jsonError(`GitHub check failed (HTTP ${check.status})`, 502);
  const { user } = (await check.json()) as { user: GitHubUser };

  const sql = db();
  const token = newToken();
  await sql.begin(async (tx) => {
    // GitHub logins can be renamed and reused. Move a stale holder of this
    // login aside; it gets its new login on its next sign-in.
    await tx`update users set login = login || '~' || id where login = ${user.login} and id <> ${user.id}`;
    await tx`
      insert into users (id, login, avatar_url) values (${user.id}, ${user.login}, ${user.avatar_url})
      on conflict (id) do update set login = excluded.login, avatar_url = excluded.avatar_url`;
    await tx`insert into api_tokens (hash, user_id) values (${hashToken(token)}, ${user.id})`;
  });

  await fetch(appTokenURL, { method: "DELETE", headers, body: JSON.stringify({ access_token: githubToken }) }).catch(
    () => {},
  );

  return Response.json({ token, login: user.login });
}
