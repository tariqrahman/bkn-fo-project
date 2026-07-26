import { computeCapSummary, CAP_THRESHOLD_METRICS } from "@nets/db/compute-cap-room";
import type { createDb } from "@nets/db";
import { playerCapSeasons, teamCapMetrics, teams } from "@nets/db/schema";
import { asc, eq } from "drizzle-orm";
import type { CapSnapshot, CapSnapshotSeason } from "./types.js";

type Db = ReturnType<typeof createDb>;

export async function buildCapSnapshot(db: Db, teamId: string): Promise<CapSnapshot | null> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId.toUpperCase()),
  });

  if (!team) return null;

  const capSeasonRows = await db
    .select({
      season: playerCapSeasons.season,
      capHitCents: playerCapSeasons.capHitCents,
      category: playerCapSeasons.category,
      spotracId: playerCapSeasons.spotracId,
    })
    .from(playerCapSeasons)
    .where(eq(playerCapSeasons.teamId, team.id));

  if (capSeasonRows.length === 0) return null;

  const seasonRows = await db
    .select({ season: playerCapSeasons.season })
    .from(playerCapSeasons)
    .where(eq(playerCapSeasons.teamId, team.id))
    .groupBy(playerCapSeasons.season)
    .orderBy(asc(playerCapSeasons.season));

  const seasons = seasonRows.map((row) => row.season);
  const primarySeason = seasons[0] ?? "";

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

  const capSummary = computeCapSummary(seasons, thresholdsByMetric, capSeasonRows);
  const summaryByKey = Object.fromEntries(capSummary.map((row) => [row.key, row.valuesBySeason]));

  const snapshotSeasons: CapSnapshotSeason[] = seasons.map((season) => {
    const activeIds = new Set(
      capSeasonRows.filter((row) => row.category === "active" && row.season === season).map((row) => row.spotracId),
    );
    const capHoldIds = new Set(
      capSeasonRows
        .filter((row) => row.category === "cap_hold" && row.season === season)
        .map((row) => row.spotracId),
    );

    return {
      season,
      salaryCapCents: summaryByKey.salary_cap?.[season] ?? null,
      activeCapCents: summaryByKey.active_cap?.[season] ?? null,
      capHoldsCents: summaryByKey.cap_holds?.[season] ?? null,
      capRoomCents: summaryByKey.cap_room?.[season] ?? null,
      taxRoomCents: summaryByKey.tax_room?.[season] ?? null,
      firstApronRoomCents: summaryByKey.first_apron_room?.[season] ?? null,
      secondApronRoomCents: summaryByKey.second_apron_room?.[season] ?? null,
      activeRosterCount: activeIds.size,
      capHoldCount: capHoldIds.size,
    };
  });

  return {
    teamId: team.id,
    teamAbbreviation: team.abbreviation,
    primarySeason,
    seasons: snapshotSeasons,
  };
}
