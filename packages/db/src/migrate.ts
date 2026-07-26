import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabaseUrl, useSsl } from "./env.js";
import * as schema from "./schema.js";

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../drizzle");
const url = getDatabaseUrl();
const client = postgres(url, { max: 1, ssl: useSsl(url) });
const db = drizzle(client, { schema });

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
} finally {
  await client.end();
}
