import { useMemo, useState } from "react";
import { DraftAssetInventoryTable } from "./DraftAssetInventoryTable";
import type { DraftPickEntry, DraftPicksResponse } from "./types";
import { bodyCellClass, cellClass, sectionTitleClass, tableHeadClass } from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

interface DraftAssetsPanelProps {
  data: DraftPicksResponse | null;
  loading?: boolean;
}

interface PickHighlight {
  noteRefs: number[];
  source: "entry" | "note";
  entryKey?: string;
  noteNumber?: number;
}

const noteHighlightClass =
  "rounded bg-yellow-100 transition-colors dark:bg-yellow-500/25";

const draftTableDividerClass = "border-r border-border";

export function DraftAssetsPanel({ data, loading }: DraftAssetsPanelProps) {
  const [hideTraded, setHideTraded] = useState(false);
  const [pickHighlight, setPickHighlight] = useState<PickHighlight | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Draft asset data is not available yet. Run{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:ingest:draft -- -- --cache</code>.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={sectionTitleClass}>Upcoming Draft Assets</h2>
        <HideTradedToggle checked={hideTraded} onChange={setHideTraded} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className={cn(tableHeadClass, draftTableDividerClass, "w-14 text-left")} />
              {data.years.map((year) => (
                <th key={year} className={cn(tableHeadClass, draftTableDividerClass, "min-w-[8rem] text-left")}>
                  {year}
                </th>
              ))}
              <th className={cn(tableHeadClass, "w-24 text-center")}>Tradeable</th>
            </tr>
          </thead>
          <tbody>
            {data.rounds.map((row) => (
              <tr key={row.round} className="border-b align-top last:border-b-0">
                <td className={cn(cellClass, draftTableDividerClass, "bg-muted font-medium text-muted-foreground")}>
                  R{row.round}
                </td>
                {data.years.map((year) => (
                  <td key={year} className={cn(bodyCellClass, draftTableDividerClass)}>
                    <PickCell
                      round={row.round}
                      year={year}
                      entries={row.cellsByYear[year] ?? []}
                      hideTraded={hideTraded}
                      pickHighlight={pickHighlight}
                      onPickHighlight={setPickHighlight}
                    />
                  </td>
                ))}
                <td className={cn(bodyCellClass, "text-center font-medium tabular-nums")}>
                  {row.tradeableCount ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.notes.length > 0 && (
        <section className="space-y-3">
          <h3 className={sectionTitleClass}>Notes</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {data.notes.map((note) => {
              const isHighlighted = pickHighlight?.noteRefs.includes(note.noteNumber) ?? false;
              return (
                <li
                  key={note.noteNumber}
                  className={cn(
                    "cursor-default px-1 py-0.5",
                    isHighlighted && noteHighlightClass,
                  )}
                  onMouseEnter={() => {
                    setPickHighlight({
                      source: "note",
                      noteNumber: note.noteNumber,
                      noteRefs: [note.noteNumber],
                    });
                  }}
                  onMouseLeave={() => {
                    setPickHighlight((current) =>
                      current?.source === "note" && current.noteNumber === note.noteNumber
                        ? null
                        : current,
                    );
                  }}
                >
                  {note.noteText}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <DraftAssetInventoryTable data={data} />
    </section>
  );
}

function HideTradedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm text-muted-foreground">Hide Traded</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Hide traded picks"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-foreground bg-foreground" : "border-border bg-muted",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0.5 inline-block h-[1.125rem] w-[1.125rem] rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function PickCell({
  round,
  year,
  entries,
  hideTraded,
  pickHighlight,
  onPickHighlight,
}: {
  round: 1 | 2;
  year: number;
  entries: DraftPickEntry[];
  hideTraded: boolean;
  pickHighlight: PickHighlight | null;
  onPickHighlight: (highlight: PickHighlight | null) => void;
}) {
  const visibleEntries = useMemo(
    () => (hideTraded ? entries.filter((entry) => !entry.isTraded) : entries),
    [entries, hideTraded],
  );

  if (visibleEntries.length === 0) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  return (
    <ul className="list-disc space-y-1.5 pl-4">
      {visibleEntries.map((entry, index) => {
        const entryKey = `${round}-${year}-${index}`;
        const hasNotes = entry.noteRefs.length > 0;
        const isHighlighted =
          (pickHighlight?.source === "entry" && pickHighlight.entryKey === entryKey) ||
          (pickHighlight?.source === "note" &&
            pickHighlight.noteNumber !== undefined &&
            entry.noteRefs.includes(pickHighlight.noteNumber));

        return (
          <li
            key={entryKey}
            className={cn(
              "leading-snug marker:text-muted-foreground",
              entry.isTraded && "text-muted-foreground line-through",
              entry.starred && "font-medium",
              hasNotes && "cursor-default",
              isHighlighted && noteHighlightClass,
            )}
            onMouseEnter={() => {
              if (hasNotes) {
                onPickHighlight({
                  source: "entry",
                  entryKey,
                  noteRefs: entry.noteRefs,
                });
              }
            }}
            onMouseLeave={() => {
              if (pickHighlight?.source === "entry" && pickHighlight.entryKey === entryKey) {
                onPickHighlight(null);
              }
            }}
          >
            {entry.starred && <span className="mr-0.5">*</span>}
            {entry.label}
            {entry.noteRefs.map((ref) => (
              <sup key={ref} className="ml-0.5 text-[10px] text-muted-foreground">
                {ref}
              </sup>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
