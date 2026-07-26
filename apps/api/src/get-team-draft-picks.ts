import { teamDraftPickEntries, teamDraftPickNotes, teamDraftPickRoundMeta, teams } from "@nets/db/schema";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@nets/db";

export interface DraftPickEntryPayload {
  label: string;
  starred: boolean;
  isTraded: boolean;
  noteRefs: number[];
}

export interface DraftPickRoundRow {
  round: 1 | 2;
  tradeableCount: number | null;
  cellsByYear: Record<number, DraftPickEntryPayload[]>;
}

export interface DraftPickNotePayload {
  noteNumber: number;
  noteText: string;
}

export interface DraftPicksResponse {
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  years: number[];
  rounds: DraftPickRoundRow[];
  notes: DraftPickNotePayload[];
}

export async function getTeamDraftPicks(db: Db, teamId: string): Promise<DraftPicksResponse | null> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId.toUpperCase()),
  });

  if (!team) return null;

  const entries = await db
    .select({
      draftYear: teamDraftPickEntries.draftYear,
      round: teamDraftPickEntries.round,
      sortOrder: teamDraftPickEntries.sortOrder,
      label: teamDraftPickEntries.label,
      starred: teamDraftPickEntries.starred,
      isTraded: teamDraftPickEntries.isTraded,
      noteRefs: teamDraftPickEntries.noteRefs,
    })
    .from(teamDraftPickEntries)
    .where(eq(teamDraftPickEntries.teamId, team.id))
    .orderBy(
      asc(teamDraftPickEntries.round),
      asc(teamDraftPickEntries.draftYear),
      asc(teamDraftPickEntries.sortOrder),
    );

  if (entries.length === 0) return null;

  const metaRows = await db
    .select({
      round: teamDraftPickRoundMeta.round,
      tradeableCount: teamDraftPickRoundMeta.tradeableCount,
    })
    .from(teamDraftPickRoundMeta)
    .where(eq(teamDraftPickRoundMeta.teamId, team.id));

  const notes = await db
    .select({
      noteNumber: teamDraftPickNotes.noteNumber,
      noteText: teamDraftPickNotes.noteText,
    })
    .from(teamDraftPickNotes)
    .where(eq(teamDraftPickNotes.teamId, team.id))
    .orderBy(asc(teamDraftPickNotes.noteNumber));

  const years = [...new Set(entries.map((entry) => entry.draftYear))].sort((a, b) => a - b);
  const tradeableByRound = new Map(metaRows.map((row) => [row.round, row.tradeableCount]));

  const rounds: DraftPickRoundRow[] = ([1, 2] as const).map((round) => {
    const cellsByYear: Record<number, DraftPickEntryPayload[]> = {};
    for (const year of years) {
      cellsByYear[year] = [];
    }

    for (const entry of entries.filter((row) => row.round === round)) {
      cellsByYear[entry.draftYear] ??= [];
      cellsByYear[entry.draftYear].push({
        label: entry.label,
        starred: entry.starred,
        isTraded: entry.isTraded,
        noteRefs: entry.noteRefs ?? [],
      });
    }

    return {
      round,
      tradeableCount: tradeableByRound.get(round) ?? null,
      cellsByYear,
    };
  });

  return {
    team: {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
    },
    years,
    rounds,
    notes,
  };
}
