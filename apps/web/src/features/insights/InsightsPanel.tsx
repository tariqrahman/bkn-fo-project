import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { TeamInsightsResponse, TeamTransaction } from "./types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { overviewPanelHeightClass, sectionTitleClass } from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

interface InsightsPanelProps {
  teamId: string;
  className?: string;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-4 w-4 animate-spin", className)}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0a12 12 0 0 0 0 24v-4a8 8 0 0 1-8-8Z"
      />
    </svg>
  );
}

function RefreshingSkeletonSlot({
  refreshing,
  children,
  className,
  skeleton,
  label = "Regenerating insights",
}: {
  refreshing: boolean;
  children: ReactNode;
  className?: string;
  skeleton: ReactNode;
  label?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(refreshing && "invisible")} aria-hidden={refreshing}>
        {children}
      </div>
      {refreshing && (
        <div className="absolute inset-0" role="status" aria-live="polite" aria-label={label}>
          {skeleton}
        </div>
      )}
    </div>
  );
}

function HeadlineSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
  );
}

function NarrativeSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: lines }, (_, index) => (
        <li key={index} className="flex gap-2">
          <Skeleton className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
          <Skeleton className={cn("h-4", index % 2 === 0 ? "w-full max-w-2xl" : "w-full max-w-xl")} />
        </li>
      ))}
    </ul>
  );
}

function CapMetricsSkeleton() {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="rounded-lg border px-3 py-2">
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </dl>
  );
}

function formatTransactionLine(transaction: TeamTransaction): string {
  return `${transaction.dateLabel} · ${transaction.playerName} — ${transaction.description}`;
}

function InsightsSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>{title}</h3>
      {children}
    </section>
  );
}

function metricValueClass(isFavorable?: boolean): string {
  if (isFavorable === undefined) return "text-foreground";
  return isFavorable ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500";
}

function CapMetricsGrid({ insights }: { insights: TeamInsightsResponse }) {
  if (insights.capMetrics.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
      {insights.capMetrics.map((metric) => (
        <div key={metric.key} className="rounded-lg border px-3 py-2">
          <dt className="text-xs text-muted-foreground">
            {metric.label}
            {metric.key !== "open_roster_spots" ? ` · ${insights.season}` : ""}
          </dt>
          <dd className={cn("text-sm font-semibold tabular-nums", metricValueClass(metric.isFavorable))}>
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DisclaimerModal({
  insights,
  onClose,
}: {
  insights: TeamInsightsResponse;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close disclaimer"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insights-disclaimer-title"
        className="relative z-10 w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="insights-disclaimer-title" className="text-lg font-semibold">
            Disclaimer
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{insights.disclaimer}</p>
          {insights.reports.length > 0 && (
            <p>
              Analyst reports referenced:{" "}
              {insights.reports.map((report, index) => (
                <span key={report.id}>
                  {index > 0 ? "; " : ""}
                  {report.title}
                  {report.asOf ? ` (${report.asOf})` : ""}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function RetryIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function InsightsHeaderActions({
  refreshing,
  onDisclaimer,
  onRegenerate,
  showDisclaimer = true,
}: {
  refreshing: boolean;
  onDisclaimer: () => void;
  onRegenerate: () => void;
  showDisclaimer?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {showDisclaimer && (
        <Tooltip content="Disclaimer">
          <button
            type="button"
            onClick={onDisclaimer}
            disabled={refreshing}
            aria-label="Disclaimer"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <WarningIcon />
          </button>
        </Tooltip>
      )}
      <Tooltip content="Regenerate Report">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={refreshing}
          aria-label={refreshing ? "Regenerating report" : "Regenerate Report"}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? <Spinner /> : <RetryIcon />}
        </button>
      </Tooltip>
    </div>
  );
}

function InsightsPanelHeader({
  refreshing,
  onDisclaimer,
  onRegenerate,
  showDisclaimer = true,
}: {
  refreshing: boolean;
  onDisclaimer: () => void;
  onRegenerate: () => void;
  showDisclaimer?: boolean;
}) {
  return (
    <CardHeader className="shrink-0 pb-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="text-lg">AI Insights</CardTitle>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Beta
          </span>
        </div>
        <InsightsHeaderActions
          refreshing={refreshing}
          onDisclaimer={onDisclaimer}
          onRegenerate={onRegenerate}
          showDisclaimer={showDisclaimer}
        />
      </div>
    </CardHeader>
  );
}

export function InsightsPanel({ teamId, className }: InsightsPanelProps) {
  const [insights, setInsights] = useState<TeamInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const loadInsights = useCallback(async (refresh: boolean, signal?: AbortSignal) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const url = refresh
        ? `/api/teams/${teamId}/insights?refresh=true`
        : `/api/teams/${teamId}/insights`;
      const response = await fetch(url, { signal });
      const payload = (await response.json()) as TeamInsightsResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : `Failed to load insights (${response.status})`);
      }

      if (signal?.aborted) return;

      setInsights(payload as TeamInsightsResponse);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (signal?.aborted) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInsights(false, controller.signal);
    return () => controller.abort();
  }, [loadInsights]);

  if (loading) {
    return (
      <Card className={cn("flex flex-col", overviewPanelHeightClass, className)}>
        <CardHeader className="shrink-0 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          <CapMetricsSkeleton />
          <HeadlineSkeleton />
          <NarrativeSkeleton lines={3} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("flex flex-col", overviewPanelHeightClass, className)}>
        <InsightsPanelHeader
          refreshing={refreshing}
          onDisclaimer={() => setDisclaimerOpen(true)}
          onRegenerate={() => void loadInsights(true)}
          showDisclaimer={false}
        />
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <Alert variant="destructive">
            <AlertTitle>Insights unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  const keyDecisionLineCount = Math.min(Math.max(insights.keyDecisions.length, 3), 5);
  const intelLineCount = Math.min(Math.max(insights.intelAnalysis.length, 3), 5);

  return (
    <>
      <Card aria-busy={refreshing} className={cn("flex flex-col", overviewPanelHeightClass, className)}>
        <InsightsPanelHeader
          refreshing={refreshing}
          onDisclaimer={() => setDisclaimerOpen(true)}
          onRegenerate={() => void loadInsights(true)}
        />

        <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
          <div className="space-y-5 pr-1">
            <CapMetricsGrid insights={insights} />

            <RefreshingSkeletonSlot
              refreshing={refreshing}
              className="min-h-[2.75rem]"
              skeleton={<HeadlineSkeleton />}
            >
              <p className="text-sm text-muted-foreground">{insights.headline}</p>
            </RefreshingSkeletonSlot>

            {insights.recentTransactions.length > 0 && (
              <InsightsSubsection title="Recent Transactions">
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {insights.recentTransactions.map((transaction, index) => (
                    <li key={`${transaction.date}-${transaction.playerName}-${index}`}>
                      {formatTransactionLine(transaction)}
                    </li>
                  ))}
                </ul>
              </InsightsSubsection>
            )}

            {insights.keyDecisions.length > 0 && (
              <InsightsSubsection title="Key Decisions">
                <RefreshingSkeletonSlot
                  refreshing={refreshing}
                  className="min-h-[5rem]"
                  skeleton={<NarrativeSkeleton lines={keyDecisionLineCount} />}
                >
                  <ul className="list-disc space-y-1.5 pl-5 text-sm">
                    {insights.keyDecisions.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                </RefreshingSkeletonSlot>
              </InsightsSubsection>
            )}

            {insights.intelAnalysis.length > 0 && (
              <InsightsSubsection title="Intel / Analysis">
                <RefreshingSkeletonSlot
                  refreshing={refreshing}
                  className="min-h-[5rem]"
                  skeleton={<NarrativeSkeleton lines={intelLineCount} />}
                >
                  <ul className="list-disc space-y-1.5 pl-5 text-sm">
                    {insights.intelAnalysis.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                </RefreshingSkeletonSlot>
              </InsightsSubsection>
            )}
          </div>
        </CardContent>
      </Card>

      {disclaimerOpen && <DisclaimerModal insights={insights} onClose={() => setDisclaimerOpen(false)} />}
    </>
  );
}
