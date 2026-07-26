import Anthropic from "@anthropic-ai/sdk";
import { InsightsError, requireAnthropicApiKey } from "./insights-error.js";
import {
  assembleInsightsPayload,
  normalizeInsightsPayload,
  type InsightsContentPayload,
} from "./build-insights-response.js";
import { buildCapPosturePhrase, buildCapSnapshotLegend } from "./build-cap-posture.js";
import type { AnalystReport, CapSnapshot, TeamInsightsPayload } from "./types.js";

const INSIGHTS_MODEL = process.env.INSIGHTS_MODEL ?? "claude-sonnet-4-5-20250929";

function buildSystemPrompt(teamAbbreviation: string): string {
  return `You summarize NBA cap situations for a front-office tool (beta).

Rules — follow strictly:
1. ONLY include strategic points explicitly stated in the analyst reports. Do NOT invent trades, signings, extensions, or roster moves not discussed in the reports.
2. Do NOT summarize transactions, signings, trades, or waivers — those are shown separately from live ingested data.
3. When referring to the team, ALWAYS use the abbreviation "${teamAbbreviation}" — never spell out the city or full team name.
4. Do NOT include cap dollar amounts, cap room figures, roster counts, or over/under-the-cap claims in headlineTheme — those are assembled separately from live data.
5. keyDecisions: concise bullets ONLY from the report id "key-decisions-remaining-summer".
6. intelAnalysis: concise bullets ONLY from the report id "post-trade-cap-posture".
7. headlineTheme: one brief thematic clause from analyst reports about strategic focus (e.g. post-trade roster fit, second-apron constraints). No cap math.
8. disclaimer: brief beta disclaimer that key decisions and intel come from internal analyst reports, transactions come from ingested Spotrac data, and cap figures come from live ingested data — not official team strategy.

Respond with ONLY valid JSON matching this schema (no markdown fences):
{
  "disclaimer": string,
  "headlineTheme": string,
  "keyDecisions": [string],
  "intelAnalysis": [string]
}`;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export async function generateInsightsContent(
  reports: AnalystReport[],
  snapshot: CapSnapshot,
): Promise<InsightsContentPayload> {
  const apiKey = requireAnthropicApiKey();
  const client = new Anthropic({ apiKey });

  const userContent = JSON.stringify(
    {
      teamAbbreviation: snapshot.teamAbbreviation,
      capPosturePhrase: buildCapPosturePhrase(snapshot),
      capFieldLegend: buildCapSnapshotLegend(),
      reports: reports.map((report) => ({
        id: report.id,
        title: report.title,
        asOf: report.asOf,
        body: report.body,
      })),
      liveCapSnapshot: snapshot,
    },
    null,
    2,
  );

  const response = await client.messages
    .create({
      model: INSIGHTS_MODEL,
      max_tokens: 2048,
      temperature: 0,
      system: buildSystemPrompt(snapshot.teamAbbreviation),
      messages: [{ role: "user", content: userContent }],
    })
    .catch((error: unknown) => {
      if (error instanceof Anthropic.APIError) {
        const detail =
          typeof error.error === "object" && error.error && "error" in error.error
            ? String((error.error as { error?: { message?: string } }).error?.message ?? error.message)
            : error.message;
        throw new InsightsError(`Anthropic API error (${INSIGHTS_MODEL}): ${detail}`, 502);
      }
      throw error;
    });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Insights model returned no text content");
  }

  const parsed = JSON.parse(extractJson(textBlock.text)) as unknown;
  try {
    return normalizeInsightsPayload(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid insights response";
    throw new InsightsError(message, 502);
  }
}

export async function generateInsights(
  reports: AnalystReport[],
  snapshot: CapSnapshot,
): Promise<TeamInsightsPayload> {
  const partial = await generateInsightsContent(reports, snapshot);
  return assembleInsightsPayload(partial, snapshot);
}
