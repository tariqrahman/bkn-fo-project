import { formatMoneyFromCents } from "./format-money.js";
import type { CapMetric, CapSnapshot } from "./types.js";

const ROSTER_SPOT_LIMIT = 15;

function isFavorableActiveCap(activeCapCents: number | null, salaryCapCents: number | null): boolean {
  if (activeCapCents === null || salaryCapCents === null) return true;
  return activeCapCents <= salaryCapCents;
}

function isFavorableRoom(roomCents: number | null): boolean {
  if (roomCents === null) return true;
  return roomCents >= 0;
}

export function buildCapMetrics(snapshot: CapSnapshot): CapMetric[] {
  const season = snapshot.seasons.find((row) => row.season === snapshot.primarySeason) ?? snapshot.seasons[0];
  if (!season) return [];

  const metrics: CapMetric[] = [
    {
      key: "active_cap",
      label: "Active Cap",
      value: formatMoneyFromCents(season.activeCapCents),
      isFavorable: isFavorableActiveCap(season.activeCapCents, season.salaryCapCents),
    },
    {
      key: "cap_room",
      label: "Cap Room",
      value: formatMoneyFromCents(season.capRoomCents),
      isFavorable: isFavorableRoom(season.capRoomCents),
    },
    {
      key: "tax_room",
      label: "Tax Room",
      value: formatMoneyFromCents(season.taxRoomCents),
      isFavorable: isFavorableRoom(season.taxRoomCents),
    },
    {
      key: "first_apron_room",
      label: "First Apron Room",
      value: formatMoneyFromCents(season.firstApronRoomCents),
      isFavorable: isFavorableRoom(season.firstApronRoomCents),
    },
    {
      key: "open_roster_spots",
      label: "Open Roster Spots",
      value: String(Math.max(0, ROSTER_SPOT_LIMIT - season.activeRosterCount)),
    },
  ];

  return metrics;
}
