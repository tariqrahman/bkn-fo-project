export type ContractType =
  | "player_option"
  | "team_option"
  | "mutual_option"
  | "ufa"
  | "rfa"
  | "erfa"
  | "two_way";

export interface PayrollPlayer {
  id: string | null;
  spotracId: string;
  fullName: string;
  headshotUrl: string | null;
  age: number | null;
  position: string | null;
  guaranteedCents: number | null;
  contractTypesBySeason: Record<string, ContractType | null>;
  capHitsBySeason: Record<string, number | null>;
  isCapHold: boolean;
}

export interface CapSummaryRow {
  key: string;
  label: string;
  valuesBySeason: Record<string, number | null>;
}

export interface PayrollResponse {
  team: {
    id: string;
    name: string;
    abbreviation: string;
    logoUrl: string | null;
  };
  seasons: string[];
  players: PayrollPlayer[];
  capHoldPlayers: PayrollPlayer[];
  totalsBySeason: Record<string, number>;
  capSummary: CapSummaryRow[];
}

export type PayrollTab = "cap-summary" | "draft-assets";
