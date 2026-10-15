import type postgres from "postgres";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { jsonError, userFromRequest } from "@/lib/auth";
import { validateRows } from "@/lib/validate";

const MAX_BODY = 1_000_000;
const DEVICE = /^[0-9a-f]{16,64}$/;
const MIN_INTERVAL = "30 seconds";

// POST { device, days: DayRow[] } with "Authorization: Bearer <token>".
//
// Rows are upserted by (user, device, day, tool, model), and the board adds
// the devices up, so two laptops on one account both count. A row only
// replaces the stored one when its total is not smaller: Claude Code
// deletes old transcripts, so a later submit can see less of an old day
// than an earlier one did.
//
// A CLI from before device ids sends none, and its rows get device ''.
// Those rows go to the first device of the user that submits with an id.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return jsonError("not logged in: run `tokenstat login`", 401);

  const text = await req.text();
  if (text.length > MAX_BODY) return jsonError("body is too large", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonError("body must be JSON", 400);
  }
  const result = validateRows(body);
  if ("error" in result) return jsonError(result.error, 400);
  const { rows } = result;
  const rawDevice = (body as { device?: unknown }).device;
  if (rawDevice !== undefined && (typeof rawDevice !== "string" || !DEVICE.test(rawDevice))) {
    return jsonError("device must be 16 to 64 hex characters", 400);
  }
  const device = rawDevice ?? "";

  const sql = db();
  const allowed = await sql`
    update users set last_submit_at = now()
    where id = ${user.id} and (last_submit_at is null or last_submit_at < now() - ${MIN_INTERVAL}::interval)
    returning id`;
  if (allowed.length === 0) return jsonError("you submitted a moment ago; try again in 30 seconds", 429);

  await sql.begin(async (tx) => {
    if (device) {
      await tx`
        update usage_daily set device = ${device}
        where user_id = ${user.id} and device = ''
          and not exists (select from usage_daily where user_id = ${user.id} and device <> '')`;
    }
    await tx`
      insert into usage_daily (user_id, device, day, tool, model, input, output, cache_read, cache_write, calls)
      select ${user.id}, ${device}, r.day, r.tool, r.model, r.input, r.output, r."cacheRead", r."cacheWrite", r.calls
      from jsonb_to_recordset(${sql.json(rows as unknown as postgres.JSONValue)}::jsonb) as r(
        day date, tool text, model text, input bigint, output bigint, "cacheRead" bigint, "cacheWrite" bigint, calls int)
      on conflict (user_id, device, day, tool, model) do update set
        input = excluded.input, output = excluded.output,
        cache_read = excluded.cache_read, cache_write = excluded.cache_write,
        calls = excluded.calls, updated_at = now()
      where excluded.input + excluded.output + excluded.cache_read + excluded.cache_write
         >= usage_daily.input + usage_daily.output + usage_daily.cache_read + usage_daily.cache_write`;
  });

  // expire: 0 so the profile link below shows the new numbers right away.
  revalidateTag("board", { expire: 0 });

  const origin = new URL(req.url).origin;
  return Response.json({ accepted: rows.length, profile: `${origin}/u/${encodeURIComponent(user.login)}` });
}
