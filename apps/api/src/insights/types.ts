export interface AnalystReport {
  id: string;
  title: string;
  asOf?: string;
  body: string;
}

export interface CapSnapshotSeason {
  season: string;
  salaryCapCents: number | null;
  activeCapCents: number | null;
  capHoldsCents: number | null;
  capRoomCents: number | null;
  taxRoomCents: number | null;
  firstApronRoomCents: number | null;
  secondApronRoomCents: number | null;
  activeRosterCount: number;
  capHoldCount: number;
}

export interface CapSnapshot {
  teamId: string;
  teamAbbreviation: string;
  primarySeason: string;
  seasons: CapSnapshotSeason[];
}

export interface CapMetric {
  key: string;
  label: string;
  value: string;
  isFavorable?: boolean;
}

export interface TeamTransaction {
  date: string;
  dateLabel: string;
  playerName: string;
  transactionType: string;
  description: string;
}

export interface TeamInsightsPayload {
  disclaimer: string;
  headline: string;
  keyDecisions: string[];
  intelAnalysis: string[];
}

export interface TeamInsightsResponse extends TeamInsightsPayload {
  teamAbbreviation: string;
  season: string;
  capMetrics: CapMetric[];
  recentTransactions: TeamTransaction[];
  generatedAt: string;
  cached: boolean;
  reports: Array<{ id: string; title: string; asOf?: string }>;
}
