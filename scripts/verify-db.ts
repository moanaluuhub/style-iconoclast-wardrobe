// Quick verification: list tables and enums in the connected Postgres DB.
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

try {
  const tables = await sql<{ tablename: string; columns: number }[]>`
    SELECT
      t.tablename,
      (SELECT count(*) FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = t.tablename)::int AS columns
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename
  `;

  const enums = await sql<{ enum_name: string; values: string[] }[]>`
    SELECT
      t.typname AS enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `;

  console.log("\n══ Tables in public schema ══");
  for (const t of tables) {
    console.log(`  ${t.tablename.padEnd(22)} ${String(t.columns).padStart(3)} cols`);
  }
  console.log(`  (${tables.length} total)`);

  console.log("\n══ Enums in public schema ══");
  for (const e of enums) {
    console.log(`  ${e.enum_name.padEnd(28)} [${e.values.join(", ")}]`);
  }
  console.log(`  (${enums.length} total)`);
} finally {
  await sql.end();
}
