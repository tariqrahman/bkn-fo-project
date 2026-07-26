import type { ContractType } from "@/features/cap/types";
import { cn } from "@/lib/utils";

/** Spotrac pill colors adapted for table cells (light bg, readable text). */
export const contractTypeCellClass: Record<ContractType, string> = {
  team_option: "bg-red-100/80 text-red-950 dark:bg-red-950/35 dark:text-red-100",
  player_option: "bg-lime-100/90 text-lime-950 dark:bg-lime-950/30 dark:text-lime-100",
  mutual_option: "bg-amber-100/90 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
  ufa: "bg-sky-100/90 text-sky-950 dark:bg-sky-950/35 dark:text-sky-100",
  rfa: "bg-rose-200/70 text-rose-950 dark:bg-rose-950/35 dark:text-rose-100",
  erfa: "bg-yellow-100/90 text-yellow-950 dark:bg-yellow-950/30 dark:text-yellow-100",
  two_way: "bg-slate-100/90 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
};

export const contractTypeLabels: Record<ContractType, string> = {
  player_option: "Player Option",
  team_option: "Team Option",
  mutual_option: "Mutual Option",
  ufa: "UFA - Projected Cap Hit",
  rfa: "RFA - Projected Cap Hit",
  erfa: "Draft Rights Cap Hold",
  two_way: "Two-Way",
};

export function getContractTypeCellClass(contractType: ContractType | null | undefined): string | undefined {
  if (!contractType) return undefined;
  return contractTypeCellClass[contractType];
}

export function getContractTypeLabel(contractType: ContractType | null | undefined): string | undefined {
  if (!contractType) return undefined;
  return contractTypeLabels[contractType];
}

export function isContractType(value: string | null | undefined): value is ContractType {
  return !!value && value in contractTypeCellClass;
}
