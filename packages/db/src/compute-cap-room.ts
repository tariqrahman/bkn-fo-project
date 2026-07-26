import { CAP_METRIC_LABELS, CAP_METRIC_ORDER } from "./cap-metrics.js";

export interface CapSummaryRow {
  key: string;
  label: string;
  valuesBySeason: Record<string, number | null>;
}

/** Threshold metrics ingested from Spotrac — room values are computed locally. */
export const CAP_THRESHOLD_METRICS = [
  "salary_cap",
  "luxury_tax",
  "first_apron",
  "second_apron",
  "luxury_tax_bill",
  "likely_bonuses",
  "unlikely_bonuses",
] as const;

export const CAP_COMPUTED_METRICS = ["active_cap", "cap_holds", "cap_room", "tax_room", "first_apron_room", "second_apron_room"] as const;

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['']/g, "'")
    .toLowerCase()
    .trim();
}

export function sumCapHits(
  rows: Array<{ season: string; capHitCents: number | null; category: string }>,
  category: string,
  season: string,
): number {
  return rows
    .filter((row) => row.category === category && row.season === season && row.capHitCents !== null)
    .reduce((sum, row) => sum + (row.capHitCents ?? 0), 0);
}

export function computeCapSummary(
  seasons: string[],
  thresholdsByMetric: Record<string, Record<string, number | null>>,
  capSeasonRows: Array<{ season: string; capHitCents: number | null; category: string }>,
): CapSummaryRow[] {
  const valuesByMetric: Record<string, Record<string, number | null>> = {};

  for (const metric of CAP_THRESHOLD_METRICS) {
    valuesByMetric[metric] = { ...thresholdsByMetric[metric] };
  }

  for (const season of seasons) {
    const activeCap = sumCapHits(capSeasonRows, "active", season);
    const capHolds = sumCapHits(capSeasonRows, "cap_hold", season);
    const salaryCap = thresholdsByMetric.salary_cap?.[season] ?? null;
    const luxuryTax = thresholdsByMetric.luxury_tax?.[season] ?? null;
    const firstApron = thresholdsByMetric.first_apron?.[season] ?? null;
    const secondApron = thresholdsByMetric.second_apron?.[season] ?? null;

    valuesByMetric.active_cap ??= {};
    valuesByMetric.cap_holds ??= {};
    valuesByMetric.cap_room ??= {};
    valuesByMetric.tax_room ??= {};
    valuesByMetric.first_apron_room ??= {};
    valuesByMetric.second_apron_room ??= {};

    valuesByMetric.active_cap[season] = activeCap;
    valuesByMetric.cap_holds[season] = capHolds;

    valuesByMetric.cap_room[season] =
      salaryCap !== null ? salaryCap - activeCap - capHolds : null;

    valuesByMetric.tax_room[season] = luxuryTax !== null ? luxuryTax - activeCap : null;

    valuesByMetric.first_apron_room[season] = firstApron !== null ? firstApron - activeCap : null;

    valuesByMetric.second_apron_room[season] = secondApron !== null ? secondApron - activeCap : null;
  }

  const metricLabels: Record<string, string> = {
    ...CAP_METRIC_LABELS,
    active_cap: "Active Cap",
    cap_holds: "Cap Holds",
  };

  const metricOrder = [
    "salary_cap",
    "active_cap",
    "cap_holds",
    "cap_room",
    "luxury_tax",
    "tax_room",
    "luxury_tax_bill",
    "first_apron",
    "first_apron_room",
    "second_apron",
    "second_apron_room",
    "likely_bonuses",
    "unlikely_bonuses",
  ];

  return metricOrder
    .filter((key) => valuesByMetric[key] && Object.keys(valuesByMetric[key]).length > 0)
    .map((key) => ({
      key,
      label: metricLabels[key] ?? key,
      valuesBySeason: Object.fromEntries(seasons.map((season) => [season, valuesByMetric[key][season] ?? null])),
    }));
}
