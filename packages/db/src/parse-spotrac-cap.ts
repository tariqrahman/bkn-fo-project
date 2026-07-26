/** Maps Spotrac row labels (normalized) to our metric keys. */
export const SPOTRAC_ROW_TO_METRIC: Record<string, string> = {
  "cap maximum": "salary_cap",
  "cap space": "cap_room",
  "tax threshold": "luxury_tax",
  "tax space": "tax_room",
  "est. tax bill": "luxury_tax_bill",
  "1st apron space": "first_apron_room",
  "2nd apron space": "second_apron_room",
  "likely bonuses total": "likely_bonuses",
  "unlikely bonuses total": "unlikely_bonuses",
};

/** Section header -> metric key for "Threshold" rows */
export const SPOTRAC_SECTION_THRESHOLD: Record<string, string> = {
  "1st apron": "first_apron",
  "2nd apron": "second_apron",
};

export interface ParsedCapMetric {
  metric: string;
  season: string;
  amountCents: number | null;
}

export function normalizeRowLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseSeasonHeader(text: string): string | null {
  const match = text.trim().match(/^(\d{4}-\d{2})$/);
  return match?.[1] ?? null;
}

function dedupeMetrics(metrics: ParsedCapMetric[]): ParsedCapMetric[] {
  const map = new Map<string, ParsedCapMetric>();

  for (const entry of metrics) {
    const key = `${entry.metric}:${entry.season}`;
    const existing = map.get(key);
    if (!existing || (existing.amountCents === null && entry.amountCents !== null)) {
      map.set(key, entry);
    }
  }

  return [...map.values()];
}

export async function parseSpotracYearlyHtml(html: string): Promise<ParsedCapMetric[]> {
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);
  const results: ParsedCapMetric[] = [];
  let currentSection: string | null = null;

  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    if (rows.length === 0) return;

    let seasons: string[] = [];

    rows.each((__, row) => {
      const cells = $(row)
        .find("th, td")
        .map((___, cell) => $(cell).text().trim())
        .get();

      if (cells.length < 2) return;

      const firstCell = normalizeRowLabel(cells[0]);

      if (cells.length >= 2 && cells.slice(1).every((c) => parseSeasonHeader(c) || c === "")) {
        const parsedSeasons = cells.slice(1).map(parseSeasonHeader).filter(Boolean) as string[];
        if (parsedSeasons.length > 0) {
          seasons = parsedSeasons;
        }
        if (firstCell === "1st apron" || firstCell === "2nd apron") {
          currentSection = firstCell;
        }
        return;
      }

      if (seasons.length === 0) return;

      let metricKey = SPOTRAC_ROW_TO_METRIC[firstCell];
      if (!metricKey && firstCell === "threshold" && currentSection) {
        metricKey = SPOTRAC_SECTION_THRESHOLD[currentSection];
      }

      if (!metricKey) return;

      for (let i = 0; i < seasons.length; i++) {
        const season = seasons[i];
        const cellValue = cells[i + 1] ?? "";
        if (!season) continue;

        results.push({
          metric: metricKey,
          season,
          amountCents: parseSalaryToCents(cellValue),
        });
      }
    });
  });

  return dedupeMetrics(results);
}

function parseSalaryToCents(value: string | null | undefined): number | null {
  if (!value) return null;

  const cleaned = value.replace(/[$,\s()]/g, "").trim();
  if (!cleaned || cleaned === "--") return null;

  const isNegative = value.includes("-") || value.includes("(");
  const dollars = Number.parseFloat(cleaned.replace(/^-/, ""));
  if (Number.isNaN(dollars)) return null;

  const cents = Math.round(dollars * 100);
  return isNegative ? -cents : cents;
}
