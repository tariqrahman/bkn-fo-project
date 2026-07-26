export function formatMoneyFromCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";

  const dollars = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);

  return cents < 0 ? `-${formatted}` : formatted;
}
