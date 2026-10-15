import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return "tsk_" + randomBytes(32).toString("base64url");
}

export type AuthedUser = { id: string; login: string };

// userFromRequest returns the user of the request's Bearer token, or null.
export async function userFromRequest(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const sql = db();
  const rows = await sql<AuthedUser[]>`
    update api_tokens t set last_used_at = now()
    from users u
    where t.hash = ${hashToken(token)} and u.id = t.user_id
    returning u.id::text as id, u.login`;
  return rows[0] ?? null;
}

export function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}
