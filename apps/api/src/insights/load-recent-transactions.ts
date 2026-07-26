import { and, desc, eq, gte } from "drizzle-orm";
import type { createDb } from "@nets/db";
import { teamTransactions } from "@nets/db/schema";
import type { TeamTransaction } from "./types.js";

type Db = ReturnType<typeof createDb>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  const monthLabel = MONTHS[Number(month) - 1];
  if (!monthLabel) return isoDate;
  return `${monthLabel} ${Number(day)}, ${year}`;
}

export async function loadRecentTransactions(
  db: Db,
  teamId: string,
  days = 30,
): Promise<TeamTransaction[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceIso = since.toISOString().slice(0, 10);

  const rows = await db.query.teamTransactions.findMany({
    where: and(eq(teamTransactions.teamId, teamId), gte(teamTransactions.transactionDate, sinceIso)),
    orderBy: [desc(teamTransactions.transactionDate), desc(teamTransactions.id)],
  });

  return rows.map((row) => ({
    date: row.transactionDate,
    dateLabel: formatDateLabel(row.transactionDate),
    playerName: row.playerName,
    transactionType: row.transactionType,
    description: row.description,
  }));
}
