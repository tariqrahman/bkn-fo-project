import type { DraftAssetInventoryRow } from "./buildDraftAssetInventory";

export type DraftAssetInventorySortKey = "rank" | "asset" | "own" | "year" | "value";
export type SortDirection = "asc" | "desc";
export type DraftAssetInventorySortState = {
  key: DraftAssetInventorySortKey;
  direction: SortDirection;
} | null;

export function nextInventorySortState(
  current: DraftAssetInventorySortState,
  key: DraftAssetInventorySortKey,
): DraftAssetInventorySortState {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

export function sortDraftAssetInventoryRows(
  rows: DraftAssetInventoryRow[],
  sort: DraftAssetInventorySortState,
): DraftAssetInventoryRow[] {
  if (!sort) return rows;

  const directionMultiplier = sort.direction === "asc" ? 1 : -1;
  const sorted = [...rows];

  sorted.sort((a, b) => {
    let result = 0;

    switch (sort.key) {
      case "rank":
        result = a.rank - b.rank;
        break;
      case "asset":
        result = a.asset.localeCompare(b.asset);
        break;
      case "own":
        result = Number(a.isOwned) - Number(b.isOwned);
        break;
      case "year":
        result = a.draftYear - b.draftYear;
        break;
      case "value":
        result = a.value - b.value;
        break;
    }

    if (result === 0) {
      result = a.rank - b.rank;
    }

    return result * directionMultiplier;
  });

  return sorted;
}
