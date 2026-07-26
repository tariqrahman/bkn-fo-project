import type { ContractType } from "./contract-types.js";
import { parseSeasonHeader } from "./parse-spotrac-cap.js";

export type PlayerCapCategory = "active" | "cap_hold";

export interface ParsedPlayerCapSeason {
  spotracId: string;
  displayName: string;
  position: string | null;
  age: number | null;
  category: PlayerCapCategory;
  season: string;
  capHitCents: number | null;
  contractLabel: string | null;
  contractType: ContractType | null;
}

export interface ParsedPlayerCapRow {
  spotracId: string;
  displayName: string;
  position: string | null;
  age: number | null;
  category: PlayerCapCategory;
  seasons: Record<
    string,
    { capHitCents: number | null; contractLabel: string | null; contractType: ContractType | null }
  >;
}

function parseCapHitCents(dataExport: string | undefined): number | null {
  const trimmed = dataExport?.trim();
  if (!trimmed || trimmed === "") return null;
  const dollars = Number.parseInt(trimmed, 10);
  if (Number.isNaN(dollars)) return null;
  return dollars * 100;
}

function extractContractLabel(cellHtml: string): string | null {
  const pillMatch = cellHtml.match(/pill-(?:ufa|erfa|rfa)[^>]*>[\s\S]*?>([^<]+(?:<span[^>]*>[\s\S]*?<\/span>)?[^<]*)/i);
  if (pillMatch) {
    return pillMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (/Two-Way/i.test(cellHtml)) return "Two-Way";

  return null;
}

function extractContractType(cellHtml: string): ContractType | null {
  if (/pill-player/i.test(cellHtml)) return "player_option";
  if (/pill-club/i.test(cellHtml)) return "team_option";
  if (/pill-mutual/i.test(cellHtml)) return "mutual_option";
  if (/pill-ufa/i.test(cellHtml)) return "ufa";
  if (/pill-rfa/i.test(cellHtml)) return "rfa";
  if (/pill-erfa/i.test(cellHtml)) return "erfa";
  if (/Two-Way/i.test(cellHtml)) return "two_way";
  return null;
}

function parsePlayerTable(
  $: ReturnType<Awaited<ReturnType<typeof import("cheerio")>>["load"]>,
  tableId: string,
  category: PlayerCapCategory,
): ParsedPlayerCapRow[] {
  const table = $(`#${tableId}`);
  if (table.length === 0) return [];

  const seasons: string[] = [];
  table.find("thead th").each((_, th) => {
    const season = parseSeasonHeader($(th).text().trim());
    if (season) seasons.push(season);
  });

  const rows: ParsedPlayerCapRow[] = [];

  table.find("tbody tr").each((_, row) => {
    const $row = $(row);
    const displayName = $row.find("td[data-export]").first().attr("data-export")?.trim();
    if (!displayName || displayName === "Incomplete Roster Charge") return;

    const href = $row.find("a.link").attr("href") ?? "";
    const spotracId = href.match(/\/id\/(\d+)\//)?.[1];
    if (!spotracId) return;

    const exportCells = $row.find("td[data-export]").toArray();
    const position = $(exportCells[1]).attr("data-export")?.trim() ?? null;
    const ageRaw = $(exportCells[2]).attr("data-export")?.trim();
    const age = ageRaw ? Number.parseInt(ageRaw, 10) : null;

    const seasonData: ParsedPlayerCapRow["seasons"] = {};
    const salaryCells = $row.find("td[data-sort]").toArray();

    for (let i = 0; i < seasons.length; i++) {
      const cell = salaryCells[i];
      if (!cell) continue;

      const $cell = $(cell);
      const sort = $cell.attr("data-sort");
      if (sort === "-10") continue;

      const cellHtml = $cell.html() ?? "";
      const capHitCents = parseCapHitCents($cell.attr("data-export"));
      const contractLabel = extractContractLabel(cellHtml);
      const contractType = extractContractType(cellHtml);

      seasonData[seasons[i]] = {
        capHitCents,
        contractLabel: contractLabel || null,
        contractType,
      };
    }

    rows.push({
      spotracId,
      displayName,
      position,
      age: Number.isNaN(age) ? null : age,
      category,
      seasons: seasonData,
    });
  });

  return rows;
}

export async function parseSpotracPlayerTables(html: string): Promise<ParsedPlayerCapSeason[]> {
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);

  const activeRows = parsePlayerTable($, "dataTable-active", "active");
  const capHoldRows = parsePlayerTable($, "dataTable-cap-hold", "cap_hold");
  const results: ParsedPlayerCapSeason[] = [];

  for (const row of [...activeRows, ...capHoldRows]) {
    for (const [season, { capHitCents, contractLabel, contractType }] of Object.entries(row.seasons)) {
      results.push({
        spotracId: row.spotracId,
        displayName: row.displayName,
        position: row.position,
        age: row.age,
        category: row.category,
        season,
        capHitCents,
        contractLabel,
        contractType,
      });
    }
  }

  return results;
}

export function groupPlayerCapRows(rows: ParsedPlayerCapSeason[]): ParsedPlayerCapRow[] {
  const grouped = new Map<string, ParsedPlayerCapRow>();

  for (const row of rows) {
    const key = `${row.category}:${row.spotracId}`;
    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        spotracId: row.spotracId,
        displayName: row.displayName,
        position: row.position,
        age: row.age,
        category: row.category,
        seasons: {},
      };
      grouped.set(key, entry);
    }

    entry.seasons[row.season] = {
      capHitCents: row.capHitCents,
      contractLabel: row.contractLabel,
      contractType: row.contractType,
    };
  }

  return [...grouped.values()];
}
