import { formatMoneyFromCents } from "./format-money.js";
import type { CapSnapshot, CapSnapshotSeason } from "./types.js";

const ROSTER_SPOT_LIMIT = 15;

function primarySeason(snapshot: CapSnapshot): CapSnapshotSeason | undefined {
  return snapshot.seasons.find((row) => row.season === snapshot.primarySeason) ?? snapshot.seasons[0];
}

/** Compact display for headline copy (e.g. $724K, $1.2M). */
export function formatCompactMoneyFromCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;

  if (dollars >= 1_000_000) {
    const millions = dollars / 1_000_000;
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return `$${rounded}M`;
  }

  if (dollars >= 1_000) {
    return `$${Math.round(dollars / 1_000)}K`;
  }

  return formatMoneyFromCents(cents);
}

/** Deterministic cap posture phrase — positive room is space, negative is over the cap. */
export function buildCapPosturePhrase(snapshot: CapSnapshot): string {
  const season = primarySeason(snapshot);
  if (!season) {
    return `${snapshot.teamAbbreviation} cap posture is unavailable.`;
  }

  const openSpots = Math.max(0, ROSTER_SPOT_LIMIT - season.activeRosterCount);
  const spotLabel = openSpots === 1 ? "1 open roster spot" : `${openSpots} open roster spots`;

  let roomPhrase: string;
  const room = season.capRoomCents;
  if (room === null) {
    roomPhrase = "cap room unavailable";
  } else if (room > 0) {
    roomPhrase = `${formatCompactMoneyFromCents(room)} in cap room`;
  } else if (room < 0) {
    roomPhrase = `${formatCompactMoneyFromCents(room)} over the cap`;
  } else {
    roomPhrase = "no cap room remaining";
  }

  return `${snapshot.teamAbbreviation} has ${roomPhrase}, ${season.activeRosterCount} active roster players, and ${spotLabel}`;
}

export function buildCapSnapshotLegend(): Record<string, string> {
  return {
    capRoomCents:
      "Positive = cap space available (under the cap). Negative = amount over the cap. Zero = exactly at the cap.",
    taxRoomCents: "Positive = room below tax line. Negative = over the tax line.",
    firstApronRoomCents: "Positive = room below first apron. Negative = over the first apron.",
    activeRosterCount: "Distinct active players on the current season cap sheet.",
  };
}
