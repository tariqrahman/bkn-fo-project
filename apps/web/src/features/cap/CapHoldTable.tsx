import { useMemo, useState } from "react";
import { CapHitTableCell } from "./CapHitCell";
import { PlayerNameCell } from "@/components/PlayerNameCell";
import type { PayrollPlayer } from "./types";
import { EMPTY_VALUE, formatMoney } from "@/lib/formatMoney";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bodyCellClass, bodyRowClass, cellClass, sectionTitleClass, stickyBodyCellClass } from "@/lib/tableStyles";
import { SortableHeader } from "@/components/SortableHeader";
import { nextSortState, sortPlayers, sumCapHitsBySeason, type SortKey, type SortState } from "./rosterSort";
import { cn } from "@/lib/utils";

interface CapHoldTableProps {
  players: PayrollPlayer[];
  seasons: string[];
}

export function CapHoldTable({ players, seasons }: CapHoldTableProps) {
  const [sort, setSort] = useState<SortState>(null);

  const sortedPlayers = useMemo(() => sortPlayers(players, sort, seasons), [players, sort, seasons]);

  function handleSort(key: SortKey) {
    setSort((current) => nextSortState(current, key));
  }

  if (players.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className={sectionTitleClass}>Cap Holds</h2>
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHeader
              label="Player"
              sortKey="player"
              sort={sort}
              onSort={handleSort}
              className="sticky left-0 z-10 min-w-[210px]"
              align="left"
            />
            <SortableHeader label="Age" sortKey="age" sort={sort} onSort={handleSort} align="right" />
            {seasons.map((season) => (
              <SortableHeader
                key={season}
                label={season}
                sortKey={`season:${season}`}
                sort={sort}
                onSort={handleSort}
                align="right"
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player) => (
            <TableRow key={player.spotracId} className={bodyRowClass}>
              <TableCell className={cn(stickyBodyCellClass, "font-medium")}>
                <PlayerNameCell name={player.fullName} headshotUrl={player.headshotUrl} />
              </TableCell>
              <TableCell className={cn(bodyCellClass, "text-right text-muted-foreground")}>
                {player.age ?? EMPTY_VALUE}
              </TableCell>
              {seasons.map((season) => (
                <CapHitTableCell
                  key={season}
                  capHitCents={player.capHitsBySeason[season]}
                  contractType={player.contractTypesBySeason[season]}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-muted/60">
            <TableCell className={cn(cellClass, "sticky left-0 z-10 bg-muted/80 font-semibold backdrop-blur")}>
              Cap Holds Total
            </TableCell>
            <TableCell className={cn(cellClass, "bg-muted/80 text-right")}>{EMPTY_VALUE}</TableCell>
            {seasons.map((season) => (
              <TableCell
                key={season}
                className={cn(cellClass, "bg-muted/80 text-right font-semibold tabular-nums")}
              >
                {formatMoney(sumCapHitsBySeason(sortedPlayers, season))}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
    </section>
  );
}
