export interface ParsedTeamTransaction {
  spotracPlayerId: string | null;
  playerName: string;
  transactionDate: string;
  dateLabel: string;
  transactionType: string;
  description: string;
}

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export function parseSpotracPlayerName(raw: string): string {
  return raw.replace(/\s*\([A-Z]{1,2}\)\s*$/, "").trim();
}

export function parseSpotracDateLabel(raw: string): string {
  return raw.replace(/\s+-\s+.*$/, "").trim();
}

export function parseSpotracDateLabelToIso(dateLabel: string): string | null {
  const match = parseSpotracDateLabel(dateLabel).match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return null;

  const month = MONTHS[match[1] ?? ""];
  if (!month) return null;

  const day = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function dedupeTransactions(transactions: ParsedTeamTransaction[]): ParsedTeamTransaction[] {
  const seen = new Set<string>();

  return transactions.filter((transaction) => {
    const key = [
      transaction.transactionDate,
      transaction.playerName,
      transaction.transactionType,
      transaction.description,
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSpotracPlayerId(href: string | undefined): string | null {
  if (!href) return null;
  const match = href.match(/\/(?:id|player)\/(\d+)/);
  return match?.[1] ?? null;
}

export async function parseSpotracTransactionsHtml(html: string): Promise<ParsedTeamTransaction[]> {
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);
  const transactions: ParsedTeamTransaction[] = [];

  $("li.transaction-row").each((_, element) => {
    const row = $(element);
    const dateLabel = parseSpotracDateLabel(row.find(".transaction-date").first().text().trim());
    const transactionDate = parseSpotracDateLabelToIso(dateLabel);
    if (!transactionDate) return;

    const playerLink = row.find(".transaction-player a").first();
    const playerName = parseSpotracPlayerName(playerLink.text().trim());
    if (!playerName) return;

    const description = row.find(".transaction-details small.d-block").first().text().replace(/\s+/g, " ").trim();
    if (!description) return;

    const transactionType = row.find(".transaction-type").first().text().replace(/\s+/g, " ").trim() || "Other";

    transactions.push({
      spotracPlayerId: parseSpotracPlayerId(playerLink.attr("href")),
      playerName,
      transactionDate,
      dateLabel,
      transactionType,
      description,
    });
  });

  if (transactions.length > 0) {
    return dedupeTransactions(transactions);
  }

  $("#transactions-injection .d-flex.align-items-center.border-bottom").each((_, element) => {
    const block = $(element);
    const dateLabel = parseSpotracDateLabel(block.find("small").first().text().trim());
    const transactionDate = parseSpotracDateLabelToIso(dateLabel);
    if (!transactionDate) return;

    const playerLink = block.find("h6.blog-entry-title a").first();
    const playerName = parseSpotracPlayerName(playerLink.text().trim());
    if (!playerName) return;

    const description = block.find("p.text-muted").first().text().replace(/\s+/g, " ").trim();
    if (!description) return;

    const transactionType = inferTransactionType(description);

    transactions.push({
      spotracPlayerId: parseSpotracPlayerId(playerLink.attr("href")),
      playerName,
      transactionDate,
      dateLabel,
      transactionType,
      description,
    });
  });

  return dedupeTransactions(transactions);
}

function inferTransactionType(description: string): string {
  const lower = description.toLowerCase();
  if (lower.startsWith("traded")) return "Trade";
  if (lower.startsWith("signed")) return "Signing";
  if (lower.startsWith("waived")) return "Waiver";
  if (lower.includes("extension")) return "Extension";
  return "Other";
}
