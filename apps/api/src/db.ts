import { createDb, type Db } from "@nets/db";

let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    db = createDb();
  }
  return db;
}
