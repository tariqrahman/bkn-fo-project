import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, useSsl } from "./env.js";
import * as schema from "./schema.js";

let client: postgres.Sql | null = null;

export function createDb(databaseUrl?: string) {
  const url = getDatabaseUrl(databaseUrl);

  if (!client) {
    client = postgres(url, {
      max: 10,
      ssl: useSsl(url),
    });
  }

  return drizzle(client, { schema });
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}

export type Db = ReturnType<typeof createDb>;

export { schema };
