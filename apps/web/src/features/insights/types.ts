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

export interface TeamInsightsResponse {
  disclaimer: string;
  headline: string;
  keyDecisions: string[];
  intelAnalysis: string[];
  recentTransactions: TeamTransaction[];
  teamAbbreviation: string;
  season: string;
  capMetrics: CapMetric[];
  generatedAt: string;
  cached: boolean;
  reports: Array<{ id: string; title: string; asOf?: string }>;
}
