import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createDb, closeDb } from "./index.js";
import {
  parseRealgmDraftPicksHtml,
  type ParsedDraftPicks,
} from "./parse-realgm-draft-picks.js";
import {
  draftPicksIngestRuns,
  teamDraftPickEntries,
  teamDraftPickNotes,
  teamDraftPickRoundMeta,
  teams,
} from "./schema.js";

const SOURCE_URL =
  "https://basketball.realgm.com/nba/teams/Brooklyn-Nets/38/Rosters/Regular";
const TEAM_ID = "BRK";

const packageDir = dirname(fileURLToPath(import.meta.url));
const rawHtmlPath = resolve(packageDir, "../../../data/raw/realgm-bkn-draft-picks.html");
const seedPath = resolve(packageDir, "../../../data/seed/realgm-bkn-draft-picks.json");

async function fetchHtml(useCache: boolean): Promise<string> {
  if (useCache && existsSync(rawHtmlPath)) {
    const cached = readFileSync(rawHtmlPath, "utf-8");
    if (!/Just a moment|cf-chl|challenge-platform/i.test(cached)) {
      return cached;
    }
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent": "nets-front-office/0.1 (local draft picks ingest; contact: dev@localhost)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    if (/Just a moment|cf-chl|challenge-platform/i.test(html)) {
      throw new Error("RealGM returned a Cloudflare challenge page.");
    }

    mkdirSync(dirname(rawHtmlPath), { recursive: true });
    writeFileSync(rawHtmlPath, html, "utf-8");
    return html;
  } catch (error) {
    if (existsSync(rawHtmlPath)) {
      const cached = readFileSync(rawHtmlPath, "utf-8");
      if (!/Just a moment|cf-chl|challenge-platform/i.test(cached)) {
        console.warn("Live fetch failed; using cached RealGM HTML.", error);
        return cached;
      }
    }
    throw error;
  }
}

function loadSeed(): ParsedDraftPicks {
  return JSON.parse(readFileSync(seedPath, "utf-8")) as ParsedDraftPicks;
}

async function main() {
  const useCache = process.argv.includes("--cache");
  const useSeed = process.argv.includes("--seed");
  const db = createDb();

  let parsed: ParsedDraftPicks;

  if (useSeed) {
    parsed = loadSeed();
    console.log(`Loaded draft picks seed with ${parsed.entries.length} entries.`);
  } else {
    console.log(`Fetching RealGM draft picks from ${SOURCE_URL}${useCache ? " (cache allowed)" : ""}...`);
    const html = await fetchHtml(useCache);
    parsed = parseRealgmDraftPicksHtml(html);
    console.log(`Parsed ${parsed.entries.length} draft pick entries across ${parsed.years.length} years.`);
  }

  if (parsed.entries.length === 0) {
    throw new Error("No draft pick entries parsed.");
  }

  await db
    .insert(teams)
    .values({
      id: TEAM_ID,
      name: "Brooklyn Nets",
      abbreviation: "BRK",
      brefSlug: "BRK",
    })
    .onConflictDoNothing();

  await db.delete(teamDraftPickEntries).where(eq(teamDraftPickEntries.teamId, TEAM_ID));
  await db.delete(teamDraftPickRoundMeta).where(eq(teamDraftPickRoundMeta.teamId, TEAM_ID));
  await db.delete(teamDraftPickNotes).where(eq(teamDraftPickNotes.teamId, TEAM_ID));

  for (const entry of parsed.entries) {
    await db.insert(teamDraftPickEntries).values({
      teamId: TEAM_ID,
      draftYear: entry.draftYear,
      round: entry.round,
      sortOrder: entry.sortOrder,
      label: entry.label,
      starred: entry.starred,
      isTraded: entry.isTraded,
      noteRefs: entry.noteRefs,
    });
  }

  for (const round of [1, 2] as const) {
    const tradeableCount = parsed.tradeableByRound[round];
    if (tradeableCount === undefined) continue;
    await db.insert(teamDraftPickRoundMeta).values({
      teamId: TEAM_ID,
      round,
      tradeableCount,
    });
  }

  for (const note of parsed.notes) {
    await db.insert(teamDraftPickNotes).values({
      teamId: TEAM_ID,
      noteNumber: note.noteNumber,
      noteText: note.noteText,
    });
  }

  await db.insert(draftPicksIngestRuns).values({
    sourceUrl: useSeed ? seedPath : SOURCE_URL,
    rowCount: parsed.entries.length + parsed.notes.length,
  });

  console.log(
    `Draft picks ingest complete: ${parsed.entries.length} entries, ${parsed.notes.length} notes.`,
  );

  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
