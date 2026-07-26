import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createDb, closeDb } from "./index.js";
import { normalizePlayerName } from "./compute-cap-room.js";
import { matchRealgmPlayerName } from "./match-realgm-name.js";
import {
  parseRealgmDepthChartHtml,
  type ParsedDepthChartSlot,
} from "./parse-realgm-depth-chart.js";
import {
  depthChartIngestRuns,
  playerCapSeasons,
  players,
  teamDepthChartSlots,
  teams,
} from "./schema.js";

const SOURCE_URL =
  "https://basketball.realgm.com/nba/teams/Brooklyn-Nets/38/Rosters/Regular";
const TEAM_ID = "BRK";

const packageDir = dirname(fileURLToPath(import.meta.url));
const rawHtmlPath = resolve(packageDir, "../../../data/raw/realgm-bkn-depth-chart.html");
const seedPath = resolve(packageDir, "../../../data/seed/realgm-bkn-depth-chart.json");

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
        "User-Agent": "nets-front-office/0.1 (local depth chart ingest; contact: dev@localhost)",
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

function loadSeedSlots(): ParsedDepthChartSlot[] {
  return JSON.parse(readFileSync(seedPath, "utf-8")) as ParsedDepthChartSlot[];
}

async function main() {
  const useCache = process.argv.includes("--cache");
  const useSeed = process.argv.includes("--seed");
  const db = createDb();

  let slots: ParsedDepthChartSlot[];

  if (useSeed) {
    slots = loadSeedSlots();
    console.log(`Loaded ${slots.length} depth chart slots from seed.`);
  } else {
    console.log(`Fetching RealGM depth chart from ${SOURCE_URL}${useCache ? " (cache allowed)" : ""}...`);
    const html = await fetchHtml(useCache);
    slots = parseRealgmDepthChartHtml(html);
    console.log(`Parsed ${slots.length} depth chart slots.`);
  }

  if (slots.length === 0) {
    throw new Error("No depth chart slots parsed.");
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

  const rosterPlayers = await db.query.players.findMany({
    where: eq(players.currentTeamId, TEAM_ID),
  });

  const capSeasonPlayers = await db
    .select({
      playerId: playerCapSeasons.playerId,
      displayName: playerCapSeasons.displayName,
      headshotUrl: playerCapSeasons.headshotUrl,
    })
    .from(playerCapSeasons)
    .where(eq(playerCapSeasons.teamId, TEAM_ID));

  const candidateMap = new Map<string, { playerId: string | null; fullName: string; headshotUrl: string | null }>();

  for (const player of rosterPlayers) {
    candidateMap.set(normalizePlayerName(player.fullName), {
      playerId: player.id,
      fullName: player.fullName,
      headshotUrl: player.headshotUrl,
    });
  }

  for (const row of capSeasonPlayers) {
    const key = normalizePlayerName(row.displayName);
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        playerId: row.playerId,
        fullName: row.displayName,
        headshotUrl: row.headshotUrl,
      });
    }
  }

  const candidates = [...candidateMap.values()].map((candidate) => ({
    playerId: candidate.playerId,
    fullName: candidate.fullName,
  }));

  const season = slots[0]?.season ?? "2026-27";

  await db
    .delete(teamDepthChartSlots)
    .where(eq(teamDepthChartSlots.teamId, TEAM_ID));

  let matchedCount = 0;

  for (const slot of slots) {
    const match = matchRealgmPlayerName(slot.displayName, slot.slugFullName, candidates);
    if (match?.playerId) matchedCount += 1;

    await db.insert(teamDepthChartSlots).values({
      teamId: TEAM_ID,
      season: slot.season,
      roleLabel: slot.roleLabel,
      roleOrder: slot.roleOrder,
      position: slot.position,
      realgmPlayerId: slot.realgmPlayerId,
      displayName: match?.fullName ?? slot.slugFullName ?? slot.displayName,
      playerId: match?.playerId ?? null,
      sortOrder: 0,
    });
  }

  await db.insert(depthChartIngestRuns).values({
    sourceUrl: useSeed ? seedPath : SOURCE_URL,
    rowCount: slots.length,
  });

  console.log(
    `Depth chart ingest complete: ${slots.length} slots for ${season} (${matchedCount} linked to roster players).`,
  );

  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
