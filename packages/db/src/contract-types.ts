export const CONTRACT_TYPES = [
  "player_option",
  "team_option",
  "mutual_option",
  "ufa",
  "rfa",
  "erfa",
  "two_way",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  player_option: "Player Option",
  team_option: "Team Option",
  mutual_option: "Mutual Option",
  ufa: "UFA - Projected Cap Hit",
  rfa: "RFA - Projected Cap Hit",
  erfa: "Draft Rights Cap Hold",
  two_way: "Two-Way",
};

export function isContractType(value: string | null | undefined): value is ContractType {
  return !!value && (CONTRACT_TYPES as readonly string[]).includes(value);
}
