import { cn } from "@/lib/utils";

export const cellClass = "px-3 py-1";

export const tableHeadClass = cn(
  cellClass,
  "h-7 bg-muted font-semibold text-foreground",
);

/** Row hover is applied per-cell so sticky columns match the rest of the row. */
export const bodyRowClass = "group hover:bg-transparent";

export const bodyCellClass = cn(
  cellClass,
  "bg-background transition-colors group-hover:bg-muted/50",
);

export const stickyBodyCellClass = cn(bodyCellClass, "sticky left-0 z-10");

export const sectionTitleClass =
  "text-lg font-semibold tracking-tight text-foreground";

export const pageContainerClass =
  "mx-auto w-full max-w-[90rem] space-y-6 px-4 py-6 sm:px-6 lg:px-8";

/** Shared height for the depth chart + insights row on desktop. */
export const overviewPanelHeightClass = "xl:h-[26rem]";

export const overviewGridClass =
  "grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]";
