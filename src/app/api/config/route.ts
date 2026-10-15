// The CLI reads the GitHub OAuth client id here, so it needs only the
// leaderboard address.
export async function GET() {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  if (!githubClientId) {
    return Response.json({ error: "GITHUB_CLIENT_ID is not set on the server" }, { status: 503 });
  }
  return Response.json({ githubClientId });
}
