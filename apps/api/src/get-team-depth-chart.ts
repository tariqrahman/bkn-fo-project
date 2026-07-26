import { DEPTH_CHART_POSITIONS } from "@nets/db/parse-realgm-depth-chart";
import { playerCapSeasons, players, teamDepthChartSlots, teams } from "@nets/db/schema";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@nets/db";

export interface DepthChartCell {
  displayName: string | null;
  fullName: string | null;
  playerId: string | null;
  headshotUrl: string | null;
}

export interface DepthChartRow {
  roleLabel: string;
  roleOrder: number;
  cells: Record<(typeof DEPTH_CHART_POSITIONS)[number], DepthChartCell>;
}

export interface DepthChartResponse {
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  season: string;
  positions: typeof DEPTH_CHART_POSITIONS;
  rows: DepthChartRow[];
}

export async function getTeamDepthChart(db: Db, teamId: string): Promise<DepthChartResponse | null> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId.toUpperCase()),
  });

  if (!team) return null;

  const slots = await db
    .select({
      season: teamDepthChartSlots.season,
      roleLabel: teamDepthChartSlots.roleLabel,
      roleOrder: teamDepthChartSlots.roleOrder,
      position: teamDepthChartSlots.position,
      displayName: teamDepthChartSlots.displayName,
      playerId: teamDepthChartSlots.playerId,
    })
    .from(teamDepthChartSlots)
    .where(eq(teamDepthChartSlots.teamId, team.id))
    .orderBy(asc(teamDepthChartSlots.roleOrder), asc(teamDepthChartSlots.position));

  if (slots.length === 0) return null;

  const rosterPlayers = await db.query.players.findMany({
    where: eq(players.currentTeamId, team.id),
  });
  const headshotByPlayerId = new Map(
    rosterPlayers.map((player) => [player.id, player.headshotUrl]),
  );

  const capHeadshots = await db
    .select({
      playerId: playerCapSeasons.playerId,
      displayName: playerCapSeasons.displayName,
      headshotUrl: playerCapSeasons.headshotUrl,
    })
    .from(playerCapSeasons)
    .where(eq(playerCapSeasons.teamId, team.id));

  const headshotByCapName = new Map(
    capHeadshots.map((row) => [row.displayName, row.headshotUrl]),
  );

  const season = slots[0].season;
  const rowMap = new Map<number, DepthChartRow>();

  for (const slot of slots) {
    let row = rowMap.get(slot.roleOrder);
    if (!row) {
      row = {
        roleLabel: slot.roleLabel,
        roleOrder: slot.roleOrder,
        cells: Object.fromEntries(
          DEPTH_CHART_POSITIONS.map((position) => [
            position,
            {
              displayName: null,
              fullName: null,
              playerId: null,
              headshotUrl: null,
            },
          ]),
        ) as DepthChartRow["cells"],
      };
      rowMap.set(slot.roleOrder, row);
    }

    const position = slot.position as (typeof DEPTH_CHART_POSITIONS)[number];
    if (!(DEPTH_CHART_POSITIONS as readonly string[]).includes(position)) continue;

    const headshotUrl =
      (slot.playerId ? headshotByPlayerId.get(slot.playerId) : null) ??
      headshotByCapName.get(slot.displayName) ??
      null;

    row.cells[position] = {
      displayName: slot.displayName,
      fullName: slot.displayName,
      playerId: slot.playerId,
      headshotUrl,
    };
  }

  return {
    team: {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
    },
    season,
    positions: DEPTH_CHART_POSITIONS,
    rows: [...rowMap.values()].sort((a, b) => a.roleOrder - b.roleOrder),
  };
}
