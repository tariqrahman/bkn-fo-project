const TEAM_SLUGS: Record<string, string> = {
  BRK: "bkn",
};

export function teamSlugForId(teamId: string): string | null {
  return TEAM_SLUGS[teamId.toUpperCase()] ?? null;
}
