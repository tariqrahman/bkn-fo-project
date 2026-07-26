import * as cheerio from "cheerio";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createDb, closeDb } from "./index.js";
import { contractSeasons, ingestRuns, players, teams } from "./schema.js";
import { brefHeadshotUrl, BROOKLYN_NETS_LOGO_URL, resolveHeadshotUrl } from "./media-urls.js";
import { resolveNbaPlayerIdFromBrefSlug } from "./nba-player-id.js";
import { extractBrefSlug, parseSalaryToCents } from "./utils.js";

const SOURCE_URL = "https://www.basketball-reference.com/contracts/BRK.html";
const TEAM = {
  id: "BRK",
  name: "Brooklyn Nets",
  abbreviation: "BRK",
  brefSlug: "BRK",
  logoUrl: BROOKLYN_NETS_LOGO_URL,
};

const packageDir = dirname(fileURLToPath(import.meta.url));
const rawHtmlPath = resolve(packageDir, "../../../data/raw/BRK.html");

interface ParsedPlayerRow {
  fullName: string;
  brefSlug: string;
  age: number | null;
  seasons: Record<string, number | null>;
  totalGuaranteedCents: number | null;
}

function findPayrollTable($: cheerio.CheerioAPI): cheerio.Cheerio<cheerio.Element> {
  const table = $("#contracts").first();
  if (table.length > 0) return table;

  const fallback = $("table").filter((_, el) => {
    const headers = $(el)
      .find("thead th")
      .map((__, th) => $(th).text().trim())
      .get();
    return headers.includes("Player") && headers.some((h) => /^\d{4}-\d{2}$/.test(h));
  });

  if (fallback.length === 0) {
    throw new Error("Could not find payroll table on Basketball Reference page.");
  }

  return fallback.first();
}

function parsePayrollTable(html: string): { seasons: string[]; rows: ParsedPlayerRow[] } {
  const $ = cheerio.load(html);
  const table = findPayrollTable($);
  const headerCells = table.find("thead tr").last().find("th");

  const headers = headerCells
    .map((_, th) => $(th).text().trim())
    .get()
    .filter(Boolean);

  const seasonColumns = headers.filter((h) => /^\d{4}-\d{2}$/.test(h));
  const guaranteedIndex = headers.indexOf("Guaranteed");

  const rows: ParsedPlayerRow[] = [];

  table.find("tbody tr").each((_, row) => {
    const cells = $(row).find("th, td");
    const playerCell = cells.first();
    const playerName = playerCell.text().trim();

    if (!playerName || playerName === "Team Totals") {
      return;
    }

    const href = playerCell.find("a").attr("href");
    const brefSlug = extractBrefSlug(href);
    if (!brefSlug) {
      console.warn(`Skipping "${playerName}": no Basketball Reference player link found.`);
      return;
    }

    const ageText = $(cells.get(1)).text().trim();
    const age = ageText ? Number.parseInt(ageText, 10) : null;

    const seasons: Record<string, number | null> = {};
    for (const season of seasonColumns) {
      const colIndex = headers.indexOf(season);
      const cellText = $(cells.get(colIndex)).text().trim();
      seasons[season] = parseSalaryToCents(cellText);
    }

    const guaranteedText =
      guaranteedIndex >= 0 ? $(cells.get(guaranteedIndex)).text().trim() : "";

    rows.push({
      fullName: playerName,
      brefSlug,
      age: Number.isNaN(age ?? NaN) ? null : age,
      seasons,
      totalGuaranteedCents: parseSalaryToCents(guaranteedText),
    });
  });

  return { seasons: seasonColumns, rows };
}

async function fetchHtml(useCache: boolean): Promise<string> {
  if (useCache) {
    const { readFileSync, existsSync } = await import("node:fs");
    if (existsSync(rawHtmlPath)) {
      return readFileSync(rawHtmlPath, "utf-8");
    }
  }

  const response = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "nets-front-office/0.1 (local data ingest; contact: dev@localhost)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  mkdirSync(dirname(rawHtmlPath), { recursive: true });
  writeFileSync(rawHtmlPath, html, "utf-8");
  return html;
}

async function main() {
  const useCache = process.argv.includes("--cache");
  const db = createDb();

  console.log(`Fetching payroll data from ${SOURCE_URL}${useCache ? " (cache allowed)" : ""}...`);
  const html = await fetchHtml(useCache);
  const { seasons, rows } = parsePayrollTable(html);

  console.log(`Parsed ${rows.length} players across seasons: ${seasons.join(", ")}`);

  await db
    .insert(teams)
    .values(TEAM)
    .onConflictDoUpdate({
      target: teams.id,
      set: {
        name: TEAM.name,
        abbreviation: TEAM.abbreviation,
        brefSlug: TEAM.brefSlug,
        logoUrl: TEAM.logoUrl,
      },
    });

  let contractRowCount = 0;
  let nbaHeadshotCount = 0;

  for (const row of rows) {
    const nbaPlayerId = await resolveNbaPlayerIdFromBrefSlug(row.brefSlug, useCache);
    const headshotUrl =
      resolveHeadshotUrl({ nbaPlayerId, brefSlug: row.brefSlug }) ?? brefHeadshotUrl(row.brefSlug);
    if (nbaPlayerId) nbaHeadshotCount += 1;

    await db
      .insert(players)
      .values({
        id: row.brefSlug,
        fullName: row.fullName,
        currentTeamId: TEAM.id,
        age: row.age,
        nbaPlayerId,
        headshotUrl,
      })
      .onConflictDoUpdate({
        target: players.id,
        set: {
          fullName: row.fullName,
          currentTeamId: TEAM.id,
          age: row.age,
          nbaPlayerId,
          headshotUrl,
        },
      });

    for (const season of seasons) {
      const salaryCents = row.seasons[season] ?? null;
      if (salaryCents === null) continue;

      await db
        .insert(contractSeasons)
        .values({
          playerId: row.brefSlug,
          teamId: TEAM.id,
          season,
          salaryCents,
          guaranteedCents: row.totalGuaranteedCents,
        })
        .onConflictDoUpdate({
          target: [contractSeasons.playerId, contractSeasons.teamId, contractSeasons.season],
          set: {
            salaryCents,
            guaranteedCents: row.totalGuaranteedCents,
          },
        });

      contractRowCount += 1;
    }
  }

  await db.insert(ingestRuns).values({
    sourceUrl: SOURCE_URL,
    rowCount: contractRowCount,
  });

  console.log(
    `Ingest complete: ${rows.length} players, ${contractRowCount} contract season rows, ${nbaHeadshotCount} NBA headshots.`,
  );
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
