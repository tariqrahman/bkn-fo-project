import { createHash } from "node:crypto";
import type { AnalystReport, CapSnapshot } from "./types.js";

export function buildCacheKey(reports: AnalystReport[], snapshot: CapSnapshot): string {
  const payload = {
    reports: reports.map((report) => ({
      id: report.id,
      title: report.title,
      body: report.body,
    })),
    snapshot,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function isDailyCacheValid(generatedAt: Date): boolean {
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return generatedAt >= startOfTodayUtc;
}
