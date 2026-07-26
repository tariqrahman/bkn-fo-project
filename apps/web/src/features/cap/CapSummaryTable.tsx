import type { CapSummaryRow } from "./types";
import { formatMoney } from "@/lib/formatMoney";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bodyCellClass, bodyRowClass, cellClass, stickyBodyCellClass, tableHeadClass } from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

interface CapSummaryTableProps {
  rows: CapSummaryRow[];
  seasons: string[];
}

export function CapSummaryTable({ rows, seasons }: CapSummaryTableProps) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        No cap summary data available. Run{" "}
        <code className="rounded bg-muted px-1 py-0.5">npm run db:ingest:cap</code>.
      </p>
    );
  }

  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(tableHeadClass, "sticky left-0 z-10")}>Metric</TableHead>
          {seasons.map((season) => (
            <TableHead key={season} className={cn(tableHeadClass, "text-right")}>
              {season}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key} className={bodyRowClass}>
            <TableCell className={cn(stickyBodyCellClass, "text-sm font-medium")}>
              {row.label}
            </TableCell>
            {seasons.map((season) => (
              <TableCell key={season} className={cn(bodyCellClass, "text-right tabular-nums text-sm")}>
                {formatMoney(row.valuesBySeason[season])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
