import { useMemo, useState } from "react";
import { buildDraftAssetInventory } from "./buildDraftAssetInventory";
import {
  nextInventorySortState,
  sortDraftAssetInventoryRows,
  type DraftAssetInventorySortKey,
  type DraftAssetInventorySortState,
} from "./draftAssetInventorySort";
import type { DraftPicksResponse } from "./types";
import { SortableHeader } from "@/components/SortableHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bodyCellClass, bodyRowClass, sectionTitleClass } from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

interface DraftAssetInventoryTableProps {
  data: DraftPicksResponse;
}

function OwnershipIcon({ isOwned }: { isOwned: boolean }) {
  if (isOwned) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-label="Owned"
        className="mx-auto h-5 w-5 text-green-600 dark:text-green-500"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-label="Not owned"
      className="mx-auto h-5 w-5 text-muted-foreground"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function DraftAssetInventoryTable({ data }: DraftAssetInventoryTableProps) {
  const [sort, setSort] = useState<DraftAssetInventorySortState>(null);

  const rows = useMemo(() => buildDraftAssetInventory(data), [data]);
  const sortedRows = useMemo(
    () => sortDraftAssetInventoryRows(rows, sort),
    [rows, sort],
  );

  const handleSort = (key: DraftAssetInventorySortKey) => {
    setSort((current) => nextInventorySortState(current, key));
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className={sectionTitleClass}>Asset Inventory</h3>
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHeader
                label="Rank"
                sortKey="rank"
                sort={sort}
                onSort={handleSort}
                className="w-16"
                align="right"
              />
              <SortableHeader
                label="Asset"
                sortKey="asset"
                sort={sort}
                onSort={handleSort}
                className="min-w-[20rem]"
                align="left"
              />
              <SortableHeader
                label="Own"
                sortKey="own"
                sort={sort}
                onSort={handleSort}
                className="w-16"
                align="center"
              />
              <SortableHeader
                label="Year"
                sortKey="year"
                sort={sort}
                onSort={handleSort}
                className="w-20"
                align="left"
              />
              <SortableHeader
                label="Value"
                sortKey="value"
                sort={sort}
                onSort={handleSort}
                className="w-20"
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.id} className={bodyRowClass}>
                <TableCell className={cn(bodyCellClass, "text-right tabular-nums font-medium")}>
                  {row.rank}
                </TableCell>
                <TableCell className={cn(bodyCellClass, "text-left")}>
                  {row.starred && <span className="mr-0.5 font-medium">*</span>}
                  {row.asset}
                  {row.noteRefs.map((ref) => (
                    <sup key={ref} className="ml-0.5 text-[10px] text-muted-foreground">
                      {ref}
                    </sup>
                  ))}
                </TableCell>
                <TableCell className={cn(bodyCellClass, "text-center")}>
                  <OwnershipIcon isOwned={row.isOwned} />
                </TableCell>
                <TableCell className={cn(bodyCellClass, "text-left tabular-nums")}>{row.year}</TableCell>
                <TableCell className={cn(bodyCellClass, "text-right tabular-nums")}>
                  {row.value.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
