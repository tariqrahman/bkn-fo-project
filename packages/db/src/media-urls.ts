const BREF_HEADSHOT_BASE = "https://www.basketball-reference.com/req/202106291/images/headshots";

export const BROOKLYN_NETS_LOGO_URL = "https://media.spotrac.com/images/thumb/bkn_2025.png";

export function nbaHeadshotUrl(nbaPlayerId: string | number): string {
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${nbaPlayerId}.png`;
}

export function brefHeadshotUrl(brefSlug: string): string {
  return `${BREF_HEADSHOT_BASE}/${brefSlug}.jpg`;
}

export function spotracHeadshotUrl(spotracId: string): string {
  return `https://media.spotrac.com/headshots/nba/${spotracId}.png`;
}

export function resolveHeadshotUrl(options: {
  nbaPlayerId?: string | null;
  brefSlug?: string | null;
  spotracId?: string | null;
}): string | null {
  if (options.nbaPlayerId) return nbaHeadshotUrl(options.nbaPlayerId);
  if (options.brefSlug) return brefHeadshotUrl(options.brefSlug);
  if (options.spotracId) return spotracHeadshotUrl(options.spotracId);
  return null;
}

export function parseSpotracTeamLogo(html: string, teamSlug: string): string | null {
  const headerMatch = html.match(/id="team-name-logo"[^>]*>\s*<img src="([^"]+)"/i);
  if (headerMatch?.[1]) return headerMatch[1];

  const slugPattern = teamSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const teamPageMatch = html.match(
    new RegExp(
      `href="https://www\\.spotrac\\.com/nba/${slugPattern}(?:/[^"]*)?"[^>]*>\\s*<img src="(https://media\\.spotrac\\.com/images/thumb/[^"]+)"`,
      "i",
    ),
  );
  if (teamPageMatch?.[1]) return teamPageMatch[1];

  const navMatch = html.match(
    new RegExp(
      `class="nav-link[^"]*"[^>]*href="https://www\\.spotrac\\.com/nba/${slugPattern}(?:/[^"]*)?"[^>]*>\\s*<img src="(https://media\\.spotrac\\.com/images/thumb/[^"]+)"`,
      "i",
    ),
  );
  return navMatch?.[1] ?? null;
}
