import type { ContractType } from "./types";
import { formatMoney } from "@/lib/formatMoney";
import { Tooltip } from "@/components/ui/tooltip";
import { TableCell } from "@/components/ui/table";
import { bodyCellClass, cellClass } from "@/lib/tableStyles";
import { getContractTypeCellClass, getContractTypeLabel } from "@/lib/contractTypeStyles";
import { cn } from "@/lib/utils";

interface CapHitTableCellProps {
  capHitCents: number | null;
  contractType: ContractType | null;
  className?: string;
}

export function CapHitTableCell({ capHitCents, contractType, className }: CapHitTableCellProps) {
  const value = formatMoney(capHitCents);
  const tooltip = getContractTypeLabel(contractType);

  const content = tooltip ? (
    <Tooltip content={tooltip}>
      <span className="block w-full">{value}</span>
    </Tooltip>
  ) : (
    value
  );

  const contractClass = getContractTypeCellClass(contractType);

  return (
    <TableCell
      className={cn(
        contractClass ? cellClass : bodyCellClass,
        "text-right tabular-nums",
        contractClass,
        className,
      )}
    >
      {content}
    </TableCell>
  );
}
