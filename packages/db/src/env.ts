import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(packageDir, "../../..");

if (!process.env.DATABASE_URL) {
  config({ path: resolve(projectRoot, ".env") });
}

export function getDatabaseUrl(databaseUrl?: string): string {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. In .env, set DATABASE_URL=postgresql://... (see .env.example).",
    );
  }
  return url;
}

export function useSsl(connectionString: string): "require" | undefined {
  return connectionString.includes("supabase") ? "require" : undefined;
}
