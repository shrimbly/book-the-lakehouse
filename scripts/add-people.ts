import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const NEW_PEOPLE = [
  { id: "mike", first: "Mike", color: "#5d6e8b" },
  { id: "andy", first: "Andy", color: "#b8825c" },
  { id: "james", first: "James", color: "#5a6e4e" },
  { id: "richy", first: "Richy", color: "#8e5e6b" },
  { id: "kate", first: "Kate", color: "#6b7a5e" },
  { id: "gwynn", first: "Gwynn", color: "#7a6b8b" },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const conn = neon(process.env.DATABASE_URL);
  const db = drizzle(conn, { schema });

  await db
    .insert(schema.people)
    .values(
      NEW_PEOPLE.map((p) => ({
        id: p.id,
        firstName: p.first,
        color: p.color,
      })),
    )
    .onConflictDoNothing();

  const rows = await db.select().from(schema.people).orderBy(schema.people.firstName);
  console.log(`\nAll people now in DB (${rows.length}):`);
  for (const r of rows) {
    console.log(`  ${r.id.padEnd(10)} ${r.firstName.padEnd(10)} ${r.color}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
