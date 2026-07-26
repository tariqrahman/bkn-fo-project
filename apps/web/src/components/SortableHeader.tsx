import type { SortDirection } from "@/features/cap/rosterSort";
import { TableHead } from "@/components/ui/table";
import { tableHeadClass } from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

type SortableHeaderAlign = "left" | "center" | "right";

export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "right",
}: {
  label: string;
  sortKey: K;
  sort: { key: K; direction: SortDirection } | null;
  onSort: (key: K) => void;
  className?: string;
  align?: SortableHeaderAlign;
}) {
  const isActive = sort?.key === sortKey;

  return (
    <TableHead
      className={cn(
        tableHeadClass,
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
          isActive ? "text-foreground" : "text-foreground/80",
        )}
      >
        <span>{label}</span>
        <SortIndicator direction={isActive ? sort.direction : null} />
      </button>
    </TableHead>
  );
}

function SortIndicator({ direction }: { direction: SortDirection | null }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
        direction === "asc" && "rotate-180 text-foreground",
        direction === "desc" && "text-foreground",
        !direction && "opacity-30",
      )}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
