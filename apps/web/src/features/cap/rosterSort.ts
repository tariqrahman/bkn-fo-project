import type { PayrollPlayer } from "./types";

export type SortKey = "player" | "age" | "guaranteed" | `season:${string}`;
export type SortDirection = "asc" | "desc";
export type SortState = { key: SortKey; direction: SortDirection } | null;

export function nextSortState(current: SortState, key: SortKey): SortState {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

function compareNullableNumbers(a: number | null | undefined, b: number | null | undefined): number {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return a - b;
}

export function sortPlayers(
  players: PayrollPlayer[],
  sort: SortState,
  seasons: string[],
): PayrollPlayer[] {
  if (!sort) return players;

  const sorted = [...players];
  const directionMultiplier = sort.direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    let result = 0;

    switch (sort.key) {
      case "player":
        result = a.fullName.localeCompare(b.fullName);
        break;
      case "age":
        result = compareNullableNumbers(a.age, b.age);
        break;
      case "guaranteed":
        result = compareNullableNumbers(a.guaranteedCents, b.guaranteedCents);
        break;
      default: {
        if (sort.key.startsWith("season:")) {
          const season = sort.key.slice("season:".length);
          result = compareNullableNumbers(a.capHitsBySeason[season], b.capHitsBySeason[season]);
        }
        break;
      }
    }

    if (result === 0 && seasons[0]) {
      const fallback = compareNullableNumbers(a.capHitsBySeason[seasons[0]], b.capHitsBySeason[seasons[0]]);
      if (fallback !== 0) result = -fallback;
      else result = a.fullName.localeCompare(b.fullName);
    }

    return result * directionMultiplier;
  });

  return sorted;
}

export function sumCapHitsBySeason(players: PayrollPlayer[], season: string): number {
  return players.reduce((sum, player) => sum + (player.capHitsBySeason[season] ?? 0), 0);
}
