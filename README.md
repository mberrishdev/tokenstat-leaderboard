# tokenstat leaderboard

A public leaderboard for Claude Code and Codex token use. People join with
`tokenstat login` (GitHub device flow) and `tokenstat submit`, which sends
daily totals by tool and model. No projects, paths, prompts, or code.

Next.js 16 on Vercel, with Supabase Postgres (project `tokenstat`, ref `gdokhnoywweasrzixbvp`).

## Deploy

1. **GitHub OAuth app.** On GitHub, go to Settings → Developer settings → OAuth Apps → New.
   Use the site URL as the homepage and callback URL, then check **Enable Device Flow**.
   Keep the client id and generate a client secret.

2. **Database.** The schema is already applied to the Supabase project. To apply it
   somewhere else, set `DATABASE_URL` and run `npm run db:migrate`.

3. **Vercel project.**

   ```sh
   npm i -g vercel
   vercel login
   vercel link
   ```

4. **Environment variables.** In Supabase, open **Connect → Transaction pooler** and copy the
   URI (port 6543). Add `?sslmode=require` to the end. Then:

   ```sh
   vercel env add DATABASE_URL
   vercel env add GITHUB_CLIENT_ID
   vercel env add GITHUB_CLIENT_SECRET
   vercel env pull .env.local
   ```

5. **Ship.**

   ```sh
   vercel deploy --prod
   ```

6. Set `defaultServer` in `tokenstat/leaderboard.go` to the production URL, and
   `INSTALL` in `src/app/page.tsx` to wherever people get that build.

## API

| Route | What it does |
| --- | --- |
| `GET /api/config` | Returns the GitHub client id for the CLI. |
| `POST /api/auth/github` | Takes `{ githubToken }` from the device flow, checks that it belongs to this OAuth app, revokes it, and returns a leaderboard token. |
| `POST /api/submit` | Takes `{ days: [...] }` with `Authorization: Bearer <token>`. Upserts by user, day, tool, and model, and keeps the larger total when a day was already sent. One submit per 30 seconds. |

## Notes

- Numbers are self-reported. Anyone can edit their logs or call the API directly, so treat the board as for fun.
- Leaderboard tokens are stored as SHA-256 hashes. The GitHub token is never stored.
- Board queries are cached for a minute (`"use cache"`, tag `board`); a submit clears the cache.
