import {
  NBA_POWER_RANK_BY_ABBR,
  NBA_TEAM_ABBREVIATIONS,
} from "./data/espn-power-rankings-2026";
import { normalizeDraftTeamAbbr } from "./draftTeamAbbrev";

/** Nearest draft year used as the baseline before future-year uncertainty decay. */
const VALUE_ANCHOR_YEAR = 2027;

/** Worst-team (rank 30) pick strength on a 0–100 scale; best team (rank 1) → 0. */
const LEAGUE_AVERAGE_PICK_STRENGTH = 50;

/** Each year beyond the anchor regresses pick strength toward league average. */
const YEAR_DECAY_RATE = 0.82;

/** Second-round picks share the same 0–100 scale but at much lower magnitude (~2.5% of 1st). */
const SECOND_ROUND_VALUE_FACTOR = 0.025;

type PickSlotMode = "own" | "lf" | "mf" | "3mf" | "single";

/**
 * Map power rank to pick-slot strength (0–100).
 * Higher rank number = worse team = more valuable pick position.
 */
export function pickStrengthFromPowerRank(powerRank: number): number {
  const clamped = Math.min(30, Math.max(1, powerRank));
  return (100 * (clamped - 1)) / 29;
}

/** Regress pick strength toward league average as draft year gets further out. */
export function applyYearUncertainty(strength: number, draftYear: number): number {
  const yearsOut = Math.max(0, draftYear - VALUE_ANCHOR_YEAR);
  const certainty = Math.pow(YEAR_DECAY_RATE, yearsOut);
  return strength * certainty + LEAGUE_AVERAGE_PICK_STRENGTH * (1 - certainty);
}

function parsePickSlotMode(label: string): { mode: PickSlotMode; body: string } {
  const trimmed = label.trim();
  if (trimmed.toLowerCase() === "own") {
    return { mode: "own", body: "" };
  }
  if (/^3MF:/i.test(trimmed)) {
    return { mode: "3mf", body: trimmed.replace(/^3MF:\s*/i, "") };
  }
  if (/^LF:/i.test(trimmed)) {
    return { mode: "lf", body: trimmed.replace(/^LF:\s*/i, "") };
  }
  if (/^MF:/i.test(trimmed)) {
    return { mode: "mf", body: trimmed.replace(/^MF:\s*/i, "") };
  }
  return { mode: "single", body: trimmed };
}

export function extractTeamCodesFromPickLabel(label: string, teamAbbreviation: string): string[] {
  const { mode, body } = parsePickSlotMode(label);
  const normalizedTeam = normalizeDraftTeamAbbr(teamAbbreviation);

  if (mode === "own") {
    return [normalizedTeam];
  }

  const tokens = body.split(/[/\s(,]+/);
  const codes = tokens
    .filter((token) => /^[A-Z]{2,3}$/.test(token))
    .map((token) => normalizeDraftTeamAbbr(token))
    .filter((token) => NBA_TEAM_ABBREVIATIONS.has(token));

  if (codes.length === 0) {
    return [normalizedTeam];
  }

  return [...new Set(codes)];
}

function strengthForTeamCode(teamCode: string): number {
  const normalized = normalizeDraftTeamAbbr(teamCode);
  return pickStrengthFromPowerRank(NBA_POWER_RANK_BY_ABBR[normalized] ?? 15);
}

function slotStrengthForMode(strengths: number[], mode: PickSlotMode): number {
  if (strengths.length === 0) {
    return LEAGUE_AVERAGE_PICK_STRENGTH;
  }

  const sortedAsc = [...strengths].sort((a, b) => a - b);
  const sortedDesc = [...strengths].sort((a, b) => b - a);

  switch (mode) {
    case "lf":
      // Least favorable slot → best involved team → lowest strength
      return sortedAsc[0];
    case "mf":
      // Most favorable slot → worst involved team → highest strength
      return sortedDesc[0];
    case "3mf":
      // Third most favorable → third-highest strength among involved teams
      return sortedDesc[Math.min(2, sortedDesc.length - 1)];
    case "own":
    case "single":
    default:
      return strengths.length === 1 ? strengths[0] : sortedDesc[0];
  }
}

export function computeDraftPickValue(
  label: string,
  round: 1 | 2,
  draftYear: number,
  teamAbbreviation: string,
): number {
  const { mode } = parsePickSlotMode(label);
  const teamCodes = extractTeamCodesFromPickLabel(label, teamAbbreviation);
  const strengths = teamCodes.map(strengthForTeamCode);
  const slotStrength = slotStrengthForMode(strengths, mode);
  const adjustedStrength = applyYearUncertainty(slotStrength, draftYear);
  const roundFactor = round === 1 ? 1 : SECOND_ROUND_VALUE_FACTOR;
  const value = adjustedStrength * roundFactor;
  return Math.round(value * 10) / 10;
}

export function isOwnedPick(label: string): boolean {
  return label.toLowerCase() === "own";
}

export function assignInventoryRanks<T extends { value: number | null }>(
  rows: T[],
): (T & { rank: number })[] {
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const aValue = a.row.value ?? 0;
    const bValue = b.row.value ?? 0;
    if (bValue !== aValue) return bValue - aValue;
    return a.index - b.index;
  });

  return indexed.map(({ row }, rankIndex) => ({
    ...row,
    rank: rankIndex + 1,
  }));
}
