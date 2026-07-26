import type { DepthChartResponse } from "./types";
import { PlayerAvatar } from "@/components/PlayerNameCell";
import { bodyCellClass, overviewPanelHeightClass, tableHeadClass } from "@/lib/tableStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DepthChartPanelProps {
  data: DepthChartResponse;
  className?: string;
}

export function DepthChartPanel({ data, className }: DepthChartPanelProps) {
  return (
    <Card className={cn("flex flex-col", overviewPanelHeightClass, className)}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">{formatSeasonLabel(data.season)} Depth Chart</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className={cn(tableHeadClass, "w-20 text-left")} />
                {data.positions.map((position) => (
                  <th key={position} className={cn(tableHeadClass, "text-center")}>
                    {position}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.roleOrder} className="border-b last:border-b-0">
                  <td className={cn(bodyCellClass, "text-xs font-medium text-muted-foreground")}>
                    {row.roleLabel}
                  </td>
                  {data.positions.map((position) => {
                    const cell = row.cells[position];
                    if (!cell?.displayName) {
                      return (
                        <td key={position} className={cn(bodyCellClass, "text-center")}>
                          <span className="text-muted-foreground/40">—</span>
                        </td>
                      );
                    }

                    const name = cell.fullName ?? cell.displayName;
                    return (
                      <td key={position} className={cn(bodyCellClass, "text-center")}>
                        <div className="flex flex-col items-center gap-1 py-0.5">
                          <PlayerAvatar
                            name={name}
                            headshotUrl={cell.headshotUrl}
                            className="h-8 w-8"
                          />
                          <span className="max-w-[5.5rem] text-[11px] leading-tight">{name}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatSeasonLabel(season: string): string {
  const match = season.match(/^(\d{4})-(\d{2,4})$/);
  if (!match) return season;
  const startYear = match[1];
  const endPart = match[2];
  const endYear = endPart.length === 2 ? `20${endPart}` : endPart;
  return `${startYear}-${endYear}`;
}
