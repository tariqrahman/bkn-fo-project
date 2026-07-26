import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (apps/api/src/insights -> four levels up). */
export const REPO_ROOT = path.resolve(currentDir, "../../../..");
