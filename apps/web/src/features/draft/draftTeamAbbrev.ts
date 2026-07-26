/** RealGM / draft asset labels use BKN; internal team id may be BRK. */
export function normalizeDraftTeamAbbr(abbreviation: string): string {
  return abbreviation.toUpperCase() === "BRK" ? "BKN" : abbreviation.toUpperCase();
}
