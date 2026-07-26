export function parseSalaryToCents(value: string | null | undefined): number | null {
  if (!value) return null;

  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;

  const dollars = Number.parseFloat(cleaned);
  if (Number.isNaN(dollars)) return null;

  return Math.round(dollars * 100);
}

export function extractBrefSlug(href: string | undefined): string | null {
  if (!href) return null;

  const match = href.match(/\/players\/[a-z]\/([a-z0-9]+)\.html/i);
  return match?.[1] ?? null;
}
