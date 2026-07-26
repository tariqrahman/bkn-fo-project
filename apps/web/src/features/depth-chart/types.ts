export interface DepthChartCell {
  displayName: string | null;
  fullName: string | null;
  playerId: string | null;
  headshotUrl: string | null;
}

export interface DepthChartRow {
  roleLabel: string;
  roleOrder: number;
  cells: Record<"PG" | "SG" | "SF" | "PF" | "C", DepthChartCell>;
}

export interface DepthChartResponse {
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  season: string;
  positions: readonly ("PG" | "SG" | "SF" | "PF" | "C")[];
  rows: DepthChartRow[];
}
