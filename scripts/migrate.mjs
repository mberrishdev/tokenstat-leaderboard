// Applies db/schema.sql to $DATABASE_URL_UNPOOLED (or $DATABASE_URL).
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (run `vercel env pull .env.local` first).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.unsafe(schema);
await sql.end();
console.log("Schema applied.");
