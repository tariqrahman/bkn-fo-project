import cors from "@fastify/cors";
import { computeCapSummary, CAP_THRESHOLD_METRICS } from "@nets/db/compute-cap-room";
import { createDb } from "@nets/db";
import { contractSeasons, playerCapSeasons, players, teamCapMetrics, teams } from "@nets/db/schema";
import { asc, eq } from "drizzle-orm";
import Fastify from "fastify";
import { getTeamDraftPicks } from "./get-team-draft-picks.js";
import { getTeamDepthChart } from "./get-team-depth-chart.js";
import { getTeamInsights, InsightsError } from "./insights/get-team-insights.js";

const db = createDb();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? true,
});

app.get("/api/health", async () => ({ status: "ok" }));

app.get<{ Params: { teamId: string } }>("/api/teams/:teamId/payroll", async (request, reply) => {
  const { teamId } = request.params;

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId.toUpperCase()),
  });

  if (!team) {
    return reply.status(404).send({ error: `Team ${teamId} not found` });
  }

  const capSeasonRows = await db
    .select({
      spotracId: playerCapSeasons.spotracId,
      displayName: playerCapSeasons.displayName,
      playerId: playerCapSeasons.playerId,
      position: playerCapSeasons.position,
      age: playerCapSeasons.age,
      category: playerCapSeasons.category,
      season: playerCapSeasons.season,
      capHitCents: playerCapSeasons.capHitCents,
      contractLabel: playerCapSeasons.contractLabel,
      contractType: playerCapSeasons.contractType,
      headshotUrl: playerCapSeasons.headshotUrl,
    })
    .from(playerCapSeasons)
    .where(eq(playerCapSeasons.teamId, team.id));

  const hasCapData = capSeasonRows.length > 0;

  const seasonRows = hasCapData
    ? await db
        .select({ season: playerCapSeasons.season })
        .from(playerCapSeasons)
        .where(eq(playerCapSeasons.teamId, team.id))
        .groupBy(playerCapSeasons.season)
        .orderBy(asc(playerCapSeasons.season))
    : await db
        .select({ season: contractSeasons.season })
        .from(contractSeasons)
        .where(eq(contractSeasons.teamId, team.id))
        .groupBy(contractSeasons.season)
        .orderBy(asc(contractSeasons.season));

  const seasons = seasonRows.map((row) => row.season);

  const roster = await db.query.players.findMany({
    where: eq(players.currentTeamId, team.id),
    with: {
      contractSeasons: {
        where: eq(contractSeasons.teamId, team.id),
      },
    },
  });

  const guaranteedByPlayerId = new Map<string, number | null>();
  for (const player of roster) {
    const guaranteed =
      player.contractSeasons.find((cs) => cs.guaranteedCents !== null)?.guaranteedCents ?? null;
    guaranteedByPlayerId.set(player.id, guaranteed);
  }

  const headshotByPlayerId = new Map(
    roster.map((player) => [player.id, player.headshotUrl]),
  );

  type PlayerPayload = {
    id: string | null;
    spotracId: string;
    fullName: string;
    headshotUrl: string | null;
    age: number | null;
    position: string | null;
    guaranteedCents: number | null;
    contractTypesBySeason: Record<string, string | null>;
    capHitsBySeason: Record<string, number | null>;
    isCapHold: boolean;
  };

  const playerMap = new Map<string, PlayerPayload>();

  for (const row of capSeasonRows) {
    const key = `${row.category}:${row.spotracId}`;
    let player = playerMap.get(key);
    if (!player) {
      player = {
        id: row.playerId,
        spotracId: row.spotracId,
        fullName: row.displayName,
        headshotUrl:
          (row.playerId ? headshotByPlayerId.get(row.playerId) : null) ??
          row.headshotUrl ??
          null,
        age: row.age,
        position: row.position,
        guaranteedCents: row.playerId ? (guaranteedByPlayerId.get(row.playerId) ?? null) : null,
        contractTypesBySeason: Object.fromEntries(seasons.map((season) => [season, null])),
        capHitsBySeason: Object.fromEntries(seasons.map((season) => [season, null])),
        isCapHold: row.category === "cap_hold",
      };
      playerMap.set(key, player);
    }

    player.capHitsBySeason[row.season] = row.capHitCents;
    player.contractTypesBySeason[row.season] = row.contractType;
  }

  const activePlayers = [...playerMap.values()]
    .filter((player) => !player.isCapHold)
    .sort((a, b) => {
      const currentSeason = seasons[0];
      const aCap = currentSeason ? (a.capHitsBySeason[currentSeason] ?? 0) : 0;
      const bCap = currentSeason ? (b.capHitsBySeason[currentSeason] ?? 0) : 0;
      return bCap - aCap;
    });

  const capHoldPlayers = [...playerMap.values()]
    .filter((player) => player.isCapHold)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const totalsBySeason: Record<string, number> = {};
  for (const season of seasons) {
    totalsBySeason[season] = activePlayers.reduce(
      (sum, player) => sum + (player.capHitsBySeason[season] ?? 0),
      0,
    );
  }

  let capSummary: Array<{
    key: string;
    label: string;
    valuesBySeason: Record<string, number | null>;
  }> = [];

  try {
    const capMetricRows = await db
      .select({
        metric: teamCapMetrics.metric,
        season: teamCapMetrics.season,
        amountCents: teamCapMetrics.amountCents,
      })
      .from(teamCapMetrics)
      .where(eq(teamCapMetrics.teamId, team.id));

    const thresholdsByMetric: Record<string, Record<string, number | null>> = {};
    for (const row of capMetricRows) {
      if (!(CAP_THRESHOLD_METRICS as readonly string[]).includes(row.metric)) continue;
      thresholdsByMetric[row.metric] ??= {};
      thresholdsByMetric[row.metric][row.season] = row.amountCents;
    }

    if (hasCapData && Object.keys(thresholdsByMetric).length > 0) {
      capSummary = computeCapSummary(seasons, thresholdsByMetric, capSeasonRows);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("team_cap_metrics") && message.includes("does not exist")) {
      request.log.warn("team_cap_metrics table missing — run npm run db:migrate && npm run db:ingest:cap");
    } else {
      throw error;
    }
  }

  return {
    team: {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      logoUrl: team.logoUrl,
    },
    seasons,
    players: activePlayers,
    capHoldPlayers,
    totalsBySeason,
    capSummary,
  };
});

app.get<{ Params: { teamId: string } }>("/api/teams/:teamId/depth-chart", async (request, reply) => {
  const { teamId } = request.params;

  try {
    const result = await getTeamDepthChart(db, teamId);
    if (!result) {
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId.toUpperCase()),
      });
      if (!team) {
        return reply.status(404).send({ error: `Team ${teamId} not found` });
      }
      return reply.status(404).send({ error: "Depth chart not found. Run npm run db:ingest:depth." });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("team_depth_chart_slots") && message.includes("does not exist")) {
      return reply.status(503).send({
        error: "Depth chart table missing — run npm run db:migrate && npm run db:ingest:depth",
      });
    }
    throw error;
  }
});

app.get<{ Params: { teamId: string } }>("/api/teams/:teamId/draft-picks", async (request, reply) => {
  const { teamId } = request.params;

  try {
    const result = await getTeamDraftPicks(db, teamId);
    if (!result) {
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId.toUpperCase()),
      });
      if (!team) {
        return reply.status(404).send({ error: `Team ${teamId} not found` });
      }
      return reply.status(404).send({ error: "Draft picks not found. Run npm run db:ingest:draft." });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("team_draft_pick_entries") && message.includes("does not exist")) {
      return reply.status(503).send({
        error: "Draft picks tables missing — run npm run db:migrate && npm run db:ingest:draft",
      });
    }
    throw error;
  }
});

app.get<{ Params: { teamId: string }; Querystring: { refresh?: string } }>(
  "/api/teams/:teamId/insights",
  async (request, reply) => {
    const { teamId } = request.params;
    const refresh = request.query.refresh === "true" || request.query.refresh === "1";

    try {
      const result = await getTeamInsights(db, teamId, { refresh });
      return reply.send(result);
    } catch (error) {
      if (error instanceof InsightsError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: "Failed to generate insights" });
    }
  },
);

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
