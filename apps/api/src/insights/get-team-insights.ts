import type { createDb } from "@nets/db";
import { teamInsightsCache } from "@nets/db/schema";
import { eq } from "drizzle-orm";
import { buildCapSnapshot } from "./build-cap-snapshot.js";
import { assembleInsightsPayload, buildInsightsResponse, normalizeInsightsPayload } from "./build-insights-response.js";
import { buildCacheKey, isDailyCacheValid } from "./cache-key.js";
import { generateInsights, generateInsightsContent } from "./generate-insights.js";
import { InsightsError } from "./insights-error.js";
import {
  getInFlightInsights,
  inFlightInsightsKey,
  setInFlightInsights,
} from "./in-flight.js";
import { loadAnalystReports } from "./load-reports.js";
import { loadRecentTransactions } from "./load-recent-transactions.js";
import { teamSlugForId } from "./team-slug.js";
import type { TeamInsightsResponse } from "./types.js";

type Db = ReturnType<typeof createDb>;

export { InsightsError } from "./insights-error.js";

export async function getTeamInsights(
  db: Db,
  teamId: string,
  options: { refresh?: boolean },
): Promise<TeamInsightsResponse> {
  const normalizedTeamId = teamId.toUpperCase();
  const teamSlug = teamSlugForId(normalizedTeamId);
  if (!teamSlug) {
    throw new InsightsError(`No analyst reports configured for team ${teamId}`, 404);
  }

  const [reports, snapshot] = await Promise.all([
    loadAnalystReports(teamSlug),
    buildCapSnapshot(db, normalizedTeamId),
  ]);

  let recentTransactions: Awaited<ReturnType<typeof loadRecentTransactions>> = [];
  try {
    recentTransactions = await loadRecentTransactions(db, normalizedTeamId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("team_transactions")) {
      throw error;
    }
  }

  if (!snapshot) {
    throw new InsightsError(
      "Cap snapshot unavailable — run npm run db:ingest:cap and ensure Spotrac data is loaded",
      503,
    );
  }

  const cacheKey = buildCacheKey(reports, snapshot);
  const reportMeta = reports.map((report) => ({
    id: report.id,
    title: report.title,
    asOf: report.asOf,
  }));

  if (!options.refresh) {
    try {
      const cached = await db.query.teamInsightsCache.findFirst({
        where: eq(teamInsightsCache.teamId, normalizedTeamId),
      });

      if (
        cached &&
        cached.cacheKey === cacheKey &&
        isDailyCacheValid(cached.generatedAt) &&
        cached.payload
      ) {
        const partial = normalizeInsightsPayload(cached.payload);
        const payload = assembleInsightsPayload(partial, snapshot);
        return buildInsightsResponse(payload, snapshot, {
          generatedAt: cached.generatedAt.toISOString(),
          cached: true,
          reports: reportMeta,
          recentTransactions,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("team_insights_cache")) {
        throw error;
      }
    }
  }

  const inFlightKey = inFlightInsightsKey(normalizedTeamId, cacheKey, Boolean(options.refresh));
  const existing = getInFlightInsights(inFlightKey);
  if (existing) {
    return existing;
  }

  return setInFlightInsights(
    inFlightKey,
    generateAndCacheInsights(db, normalizedTeamId, cacheKey, reports, snapshot, reportMeta, recentTransactions),
  );
}

async function generateAndCacheInsights(
  db: Db,
  teamId: string,
  cacheKey: string,
  reports: Awaited<ReturnType<typeof loadAnalystReports>>,
  snapshot: NonNullable<Awaited<ReturnType<typeof buildCapSnapshot>>>,
  reportMeta: Array<{ id: string; title: string; asOf?: string }>,
  recentTransactions: Awaited<ReturnType<typeof loadRecentTransactions>>,
): Promise<TeamInsightsResponse> {
  const partial = await generateInsightsContent(reports, snapshot);
  const payload = assembleInsightsPayload(partial, snapshot);
  const generatedAt = new Date();

  try {
    await db
      .insert(teamInsightsCache)
      .values({
        teamId,
        cacheKey,
        payload: partial,
        generatedAt,
      })
      .onConflictDoUpdate({
        target: teamInsightsCache.teamId,
        set: {
          cacheKey,
          payload: partial,
          generatedAt,
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("team_insights_cache") && message.includes("does not exist")) {
      throw new InsightsError("Insights cache table missing — run npm run db:migrate", 503);
    }
    throw error;
  }

  return buildInsightsResponse(payload, snapshot, {
    generatedAt: generatedAt.toISOString(),
    cached: false,
    reports: reportMeta,
    recentTransactions,
  });
}
