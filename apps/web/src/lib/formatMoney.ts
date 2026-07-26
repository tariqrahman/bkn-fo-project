export const EMPTY_VALUE = "--";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return EMPTY_VALUE;

  const formatted = moneyFormatter.format(Math.abs(cents) / 100);
  return cents < 0 ? `-${formatted}` : formatted;
}
