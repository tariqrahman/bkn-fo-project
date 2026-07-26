import type { DraftPicksResponse } from "./types";
import {
  assignInventoryRanks,
  computeDraftPickValue,
  isOwnedPick,
} from "./computeDraftPickValue";
import { normalizeDraftTeamAbbr } from "./draftTeamAbbrev";

export interface DraftAssetInventoryRow {
  id: string;
  rank: number;
  asset: string;
  isOwned: boolean;
  year: string;
  value: number;
  draftYear: number;
  round: 1 | 2;
  label: string;
  noteRefs: number[];
  starred: boolean;
}

function roundLabel(round: 1 | 2): string {
  return round === 1 ? "1st" : "2nd";
}

function formatAssetDescription(
  draftYear: number,
  round: 1 | 2,
  label: string,
  teamAbbreviation: string,
): string {
  const teamAbbr = normalizeDraftTeamAbbr(teamAbbreviation);
  const description = label.toLowerCase() === "own" ? teamAbbr : label;
  return `${draftYear} ${roundLabel(round)} - ${description}`;
}

/** Flatten owned (non-traded) picks, score by power-rank heuristic, and rank by value. */
export function buildDraftAssetInventory(data: DraftPicksResponse): DraftAssetInventoryRow[] {
  const rows: Omit<DraftAssetInventoryRow, "rank">[] = [];

  for (const roundRow of data.rounds) {
    for (const year of data.years) {
      const entries = roundRow.cellsByYear[year] ?? [];

      entries.forEach((entry, index) => {
        if (entry.isTraded) return;

        rows.push({
          id: `${roundRow.round}-${year}-${index}`,
          asset: formatAssetDescription(year, roundRow.round, entry.label, data.team.abbreviation),
          isOwned: isOwnedPick(entry.label),
          year: String(year),
          value: computeDraftPickValue(
            entry.label,
            roundRow.round,
            year,
            normalizeDraftTeamAbbr(data.team.abbreviation),
          ),
          draftYear: year,
          round: roundRow.round,
          label: entry.label,
          noteRefs: entry.noteRefs,
          starred: entry.starred,
        });
      });
    }
  }

  return assignInventoryRanks(rows);
}
