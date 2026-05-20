import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: Db | null = null;

export function hasDatabaseUrl(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

export function getDb(): Db {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Connect a Neon database via the Vercel dashboard (Storage -> Create Database -> Neon), then pull env vars with `vercel env pull .env.local`.",
    );
  }

  if (!cachedDb) {
    const sql = neon(url);
    cachedDb = drizzle(sql, { schema });
  }

  return cachedDb;
}
