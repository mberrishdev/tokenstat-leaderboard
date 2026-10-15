import "server-only";
import postgres from "postgres";

// One pool per function instance. Fluid Compute reuses instances, and dev
// hot reloads would otherwise open a new pool on every change.
const g = globalThis as unknown as { sql?: postgres.Sql };

function connect(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Supabase's transaction pooler (port 6543) cannot keep prepared
  // statements between queries.
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
}

export function db(): postgres.Sql {
  g.sql ??= connect();
  return g.sql;
}
