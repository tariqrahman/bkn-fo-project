import * as cheerio from "cheerio";
import { realgmSlugToFullName } from "./match-realgm-name.js";

export const DEPTH_CHART_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
export type DepthChartPosition = (typeof DEPTH_CHART_POSITIONS)[number];

export interface ParsedDepthChartSlot {
  season: string;
  roleLabel: string;
  roleOrder: number;
  position: DepthChartPosition;
  displayName: string;
  slugFullName: string | null;
  realgmPlayerId: string | null;
}

const PLAYER_LINK_RE = /\/player\/([^/]+)\/Summary\/(\d+)/i;

function parseSeasonFromHeading(text: string): string | null {
  const match = text.match(/(\d{4})-(\d{4}|\d{2})/);
  if (!match) return null;

  const startYear = match[1];
  const endPart = match[2];
  const endYear = endPart.length === 2 ? `20${endPart}` : endPart;
  return `${startYear}-${endYear.slice(2)}`;
}

function normalizeRoleLabel(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isPositionHeader(cells: string[]): DepthChartPosition[] | null {
  const normalized = cells.map((cell) => cell.trim().toUpperCase());
  const positions = normalized.filter((cell) =>
    (DEPTH_CHART_POSITIONS as readonly string[]).includes(cell),
  );
  if (positions.length !== DEPTH_CHART_POSITIONS.length) return null;
  if (!DEPTH_CHART_POSITIONS.every((pos, index) => normalized[index + (cells.length - 5)] === pos)) {
    const start = normalized.findIndex((cell) => cell === "PG");
    if (start === -1) return null;
    const slice = normalized.slice(start, start + 5);
    if (!DEPTH_CHART_POSITIONS.every((pos, index) => slice[index] === pos)) return null;
    return [...DEPTH_CHART_POSITIONS];
  }
  return [...DEPTH_CHART_POSITIONS];
}

function extractPlayerFromCell(cellHtml: string): {
  displayName: string;
  slugFullName: string | null;
  realgmPlayerId: string | null;
} | null {
  const $ = cheerio.load(`<td>${cellHtml}</td>`);
  const link = $("a[href*='/player/']").first();
  if (link.length === 0) return null;

  const href = link.attr("href") ?? "";
  const match = href.match(PLAYER_LINK_RE);
  const displayName = link.text().replace(/\s+/g, " ").trim();
  if (!displayName) return null;

  return {
    displayName,
    slugFullName: match ? realgmSlugToFullName(match[1]) : null,
    realgmPlayerId: match?.[2] ?? null,
  };
}

function parseDepthChartTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Element,
  season: string,
): ParsedDepthChartSlot[] {
  const slots: ParsedDepthChartSlot[] = [];
  const rows = $(table).find("tr").toArray();
  if (rows.length === 0) return slots;

  let positionOffset = 1;
  let roleOrder = 0;
  let lastRoleLabel: string | null = null;

  for (const row of rows) {
    const cells = $(row)
      .find("th, td")
      .toArray()
      .map((cell) => $(cell).html()?.trim() ?? "");

    if (cells.length === 0) continue;

    const textCells = $(row)
      .find("th, td")
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());

    const headerPositions = isPositionHeader(textCells);
    if (headerPositions) {
      positionOffset = textCells.findIndex((cell) => cell.toUpperCase() === "PG");
      if (positionOffset < 0) positionOffset = 1;
      continue;
    }

    const roleLabel = normalizeRoleLabel(textCells[0] ?? "");
    if (!roleLabel || roleLabel.toUpperCase() === "PG") continue;

    if (roleLabel !== lastRoleLabel) {
      if (lastRoleLabel !== null) roleOrder += 1;
      lastRoleLabel = roleLabel;
    } else {
      roleOrder += 1;
    }

    for (let index = 0; index < DEPTH_CHART_POSITIONS.length; index += 1) {
      const position = DEPTH_CHART_POSITIONS[index];
      const cellHtml = cells[positionOffset + index] ?? "";
      const player = extractPlayerFromCell(cellHtml);
      if (!player) continue;

      slots.push({
        season,
        roleLabel,
        roleOrder,
        position,
        displayName: player.displayName,
        slugFullName: player.slugFullName,
        realgmPlayerId: player.realgmPlayerId,
      });
    }
  }

  return slots;
}

export function parseRealgmDepthChartHtml(html: string): ParsedDepthChartSlot[] {
  const $ = cheerio.load(html);

  const heading = $("h2, h3, h4")
    .filter((_, element) => /depth chart/i.test($(element).text()))
    .first();

  let season =
    parseSeasonFromHeading(heading.text()) ??
    parseSeasonFromHeading($("title").text()) ??
    null;

  const tables: cheerio.Element[] = [];

  if (heading.length > 0) {
    let next = heading.next();
    while (next.length > 0 && next[0]?.tagName !== "table") {
      next = next.next();
    }
    if (next[0]?.tagName === "table") {
      tables.push(next[0]);
    }
  }

  if (tables.length === 0) {
    $("table").each((_, table) => {
      const headerText = $(table).text();
      if (headerText.includes("PG") && headerText.includes("Starters")) {
        tables.push(table);
      }
    });
  }

  if (tables.length === 0) {
    throw new Error("Could not find depth chart table in RealGM HTML.");
  }

  if (!season) {
    const nearbyText = heading.length > 0 ? heading.text() : $(tables[0]).prevAll("h2,h3,h4").first().text();
    season = parseSeasonFromHeading(nearbyText) ?? "2026-27";
  }

  return parseDepthChartTable($, tables[0], season);
}
