import { useEffect, useState } from "react";
import { CapHoldTable } from "@/features/cap/CapHoldTable";
import { CapSummaryTable } from "@/features/cap/CapSummaryTable";
import { PayrollTable } from "@/features/cap/PayrollTable";
import type { PayrollResponse, PayrollTab } from "@/features/cap/types";
import { DepthChartPanel } from "@/features/depth-chart/DepthChartPanel";
import type { DepthChartResponse } from "@/features/depth-chart/types";
import { DraftAssetsPanel } from "@/features/draft/DraftAssetsPanel";
import type { DraftPicksResponse } from "@/features/draft/types";
import { InsightsPanel } from "@/features/insights/InsightsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  pageContainerClass,
  overviewGridClass,
  overviewPanelHeightClass,
  sectionTitleClass,
} from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

const tabs: { id: PayrollTab; label: string }[] = [
  { id: "cap-summary", label: "Cap Summary" },
  { id: "draft-assets", label: "Draft Assets" },
];

function OverviewSkeleton() {
  return (
    <div className={overviewGridClass}>
      <Card className={cn("order-1 flex flex-col xl:order-2", overviewPanelHeightClass)}>
        <CardHeader className="shrink-0 pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardContent>
      </Card>
      <Card className={cn("order-2 flex flex-col xl:order-1", overviewPanelHeightClass)}>
        <CardHeader className="shrink-0 pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="flex gap-2">
              <Skeleton className="h-16 w-16 shrink-0" />
              {Array.from({ length: 5 }).map((_, col) => (
                <Skeleton key={col} className="h-16 flex-1" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function PayrollPage() {
  const [data, setData] = useState<PayrollResponse | null>(null);
  const [depthChart, setDepthChart] = useState<DepthChartResponse | null>(null);
  const [draftPicks, setDraftPicks] = useState<DraftPicksResponse | null>(null);
  const [draftPicksLoading, setDraftPicksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PayrollTab>("cap-summary");

  useEffect(() => {
    let cancelled = false;

    async function loadPayroll() {
      try {
        const [payrollResponse, depthResponse] = await Promise.all([
          fetch("/api/teams/BRK/payroll"),
          fetch("/api/teams/BRK/depth-chart"),
        ]);

        if (!payrollResponse.ok) {
          throw new Error(`Failed to load payroll (${payrollResponse.status})`);
        }

        const payload = (await payrollResponse.json()) as PayrollResponse;
        if (!cancelled) {
          setData(payload);
        }

        if (depthResponse.ok) {
          const depthPayload = (await depthResponse.json()) as DepthChartResponse;
          if (!cancelled) {
            setDepthChart(depthPayload);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayroll();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDraftPicks() {
      setDraftPicksLoading(true);
      try {
        const response = await fetch("/api/teams/BRK/draft-picks");
        if (response.ok) {
          const payload = (await response.json()) as DraftPicksResponse;
          if (!cancelled) setDraftPicks(payload);
        }
      } finally {
        if (!cancelled) setDraftPicksLoading(false);
      }
    }

    void loadDraftPicks();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={pageContainerClass}>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-72" />
          <ThemeToggle />
        </div>
        <OverviewSkeleton />
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageContainerClass}>
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error loading payroll</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={pageContainerClass}>
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <Alert variant="destructive">
          <AlertTitle>No data</AlertTitle>
          <AlertDescription>No payroll data available.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={pageContainerClass}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {data.team.logoUrl && (
            <img
              src={data.team.logoUrl}
              alt=""
              className="h-14 w-14 shrink-0 object-contain"
            />
          )}
          <h1 className="text-3xl font-semibold tracking-tight">{data.team.name} - Strategy</h1>
        </div>
        <ThemeToggle className="shrink-0" />
      </div>

      <div className={overviewGridClass}>
        {depthChart && (
          <DepthChartPanel data={depthChart} className="order-2 xl:order-1" />
        )}
        <InsightsPanel teamId={data.team.id} className="order-1 xl:order-2" />
      </div>

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "cap-summary" ? (
        <div className="space-y-10">
          <PayrollTable data={data} />
          <CapHoldTable players={data.capHoldPlayers} seasons={data.seasons} />
          <section className="space-y-3">
            <h2 className={sectionTitleClass}>Cap Summary</h2>
            <CapSummaryTable rows={data.capSummary} seasons={data.seasons} />
          </section>
        </div>
      ) : (
        <DraftAssetsPanel data={draftPicks} loading={draftPicksLoading} />
      )}
    </div>
  );
}
