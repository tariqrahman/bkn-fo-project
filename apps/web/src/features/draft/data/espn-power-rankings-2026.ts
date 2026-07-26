/**
 * ESPN NBA power rankings — 2026 offseason edition.
 * Source: https://www.espn.com/nba/story/_/id/49359567/free-agency-nba-power-rankings-2026-offseason-all-30-teams
 * Published July 2026 (pre-LeBron-to-PHI note in article).
 *
 * Rank 1 = best team (least valuable pick slot). Rank 30 = worst (most valuable pick slot).
 */
export const ESPN_POWER_RANKINGS_SOURCE =
  "ESPN NBA Power Rankings, 2026 offseason (Jul 2026)";

export const ESPN_POWER_RANKINGS_AS_OF = "2026-07";

/** Team abbreviation → power rank (1 best … 30 worst). GSW/PHX tied at 19. */
export const NBA_POWER_RANK_BY_ABBR: Record<string, number> = {
  OKC: 1,
  SAS: 2,
  NYK: 3,
  DEN: 4,
  PHI: 5,
  DET: 6,
  MIN: 7,
  CLE: 8,
  BOS: 9,
  HOU: 10,
  LAL: 11,
  MIA: 12,
  TOR: 13,
  ATL: 14,
  IND: 15,
  ORL: 16,
  UTA: 17,
  POR: 18,
  GSW: 19,
  PHX: 19,
  CHA: 21,
  WAS: 22,
  DAL: 23,
  LAC: 24,
  CHI: 25,
  MEM: 26,
  NOP: 27,
  BKN: 28,
  MIL: 29,
  SAC: 30,
};

export const NBA_TEAM_ABBREVIATIONS = new Set(Object.keys(NBA_POWER_RANK_BY_ABBR));
