import type { TeamInsightsPayload, TeamInsightsResponse } from "./types.js";
import { buildCapMetrics } from "./build-cap-metrics.js";
import { buildCapPosturePhrase } from "./build-cap-posture.js";
import type { CapSnapshot, TeamTransaction } from "./types.js";

export interface InsightsContentPayload {
  disclaimer: string;
  headlineTheme: string;
  keyDecisions: string[];
  intelAnalysis: string[];
}

function normalizeStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && typeof (item as { text?: string }).text === "string") {
      return (item as { text: string }).text;
    }
    throw new Error(`${field}[${index}] is invalid`);
  });
}

export function normalizeInsightsPayload(raw: unknown): InsightsContentPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Insights payload is not an object");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.disclaimer !== "string") {
    throw new Error("Insights payload missing disclaimer");
  }

  const headlineTheme =
    typeof obj.headlineTheme === "string"
      ? obj.headlineTheme
      : typeof obj.headline === "string"
        ? obj.headline
        : null;

  if (!headlineTheme) {
    throw new Error("Insights payload missing headlineTheme");
  }

  const keyDecisions =
    obj.keyDecisions !== undefined
      ? normalizeStringArray(obj.keyDecisions, "keyDecisions")
      : [];
  const intelAnalysis =
    obj.intelAnalysis !== undefined
      ? normalizeStringArray(obj.intelAnalysis, "intelAnalysis")
      : normalizeStringArray(obj.fromReports, "fromReports");

  return {
    disclaimer: obj.disclaimer,
    headlineTheme,
    keyDecisions,
    intelAnalysis,
  };
}

export function assembleInsightsPayload(
  partial: InsightsContentPayload,
  snapshot: CapSnapshot,
): TeamInsightsPayload {
  const capPhrase = buildCapPosturePhrase(snapshot);
  let theme = partial.headlineTheme.trim().replace(/[.!?]+$/, "");

  const primary = snapshot.seasons.find((row) => row.season === snapshot.primarySeason) ?? snapshot.seasons[0];
  if (
    primary?.capRoomCents !== null &&
    primary?.capRoomCents !== undefined &&
    primary.capRoomCents > 0 &&
    /over the cap/i.test(theme)
  ) {
    theme = "";
  }

  return {
    disclaimer: partial.disclaimer,
    headline: theme.length > 0 ? `${capPhrase}; ${theme}.` : `${capPhrase}.`,
    keyDecisions: partial.keyDecisions,
    intelAnalysis: partial.intelAnalysis,
  };
}

export function buildInsightsResponse(
  payload: TeamInsightsPayload,
  snapshot: CapSnapshot,
  options: {
    generatedAt: string;
    cached: boolean;
    reports: Array<{ id: string; title: string; asOf?: string }>;
    recentTransactions: TeamTransaction[];
  },
): TeamInsightsResponse {
  return {
    ...payload,
    teamAbbreviation: snapshot.teamAbbreviation,
    season: snapshot.primarySeason,
    capMetrics: buildCapMetrics(snapshot),
    recentTransactions: options.recentTransactions,
    generatedAt: options.generatedAt,
    cached: options.cached,
    reports: options.reports,
  };
}
