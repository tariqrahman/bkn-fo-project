export interface DraftPickEntry {
  label: string;
  starred: boolean;
  isTraded: boolean;
  noteRefs: number[];
}

export interface DraftPickRoundRow {
  round: 1 | 2;
  tradeableCount: number | null;
  cellsByYear: Record<number, DraftPickEntry[]>;
}

export interface DraftPickNote {
  noteNumber: number;
  noteText: string;
}

export interface DraftPicksResponse {
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  years: number[];
  rounds: DraftPickRoundRow[];
  notes: DraftPickNote[];
}
