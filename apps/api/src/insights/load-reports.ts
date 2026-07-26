import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AnalystReport } from "./types.js";
import { REPO_ROOT } from "./repo-root.js";

interface ReportIndexEntry {
  id: string;
  title: string;
  file: string;
  asOf?: string;
}

interface ReportIndex {
  reports: ReportIndexEntry[];
}

/** Analyst commentary only — transaction facts come from ingested Spotrac data. */
const ANALYST_REPORT_IDS = new Set(["post-trade-cap-posture", "key-decisions-remaining-summer"]);

export async function loadAnalystReports(teamSlug: string): Promise<AnalystReport[]> {
  const reportsDir = path.join(REPO_ROOT, "data", "reports", teamSlug);
  const indexPath = path.join(reportsDir, "index.json");
  const indexRaw = await readFile(indexPath, "utf8");
  const index = JSON.parse(indexRaw) as ReportIndex;

  const reports: AnalystReport[] = [];
  for (const entry of index.reports) {
    if (!ANALYST_REPORT_IDS.has(entry.id)) continue;
    const body = await readFile(path.join(reportsDir, entry.file), "utf8");
    reports.push({
      id: entry.id,
      title: entry.title,
      asOf: entry.asOf,
      body: body.trim(),
    });
  }

  return reports;
}
