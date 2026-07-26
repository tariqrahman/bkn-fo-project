import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, closeDb } from "./index.js";
import { CAP_THRESHOLD_METRICS } from "./compute-cap-room.js";
import { parseSpotracYearlyHtml } from "./parse-spotrac-cap.js";
import { parseSpotracPlayerTables } from "./parse-spotrac-players.js";
import { parseSpotracTransactionsHtml } from "./parse-spotrac-transactions.js";
import { capIngestRuns, playerCapSeasons, teamCapMetrics, teamTransactions, teams, players } from "./schema.js";
import { normalizePlayerName } from "./compute-cap-room.js";
import { parseSpotracTeamLogo, resolveHeadshotUrl, spotracHeadshotUrl, BROOKLYN_NETS_LOGO_URL } from "./media-urls.js";
import { resolveNbaPlayerIdByName } from "./nba-player-id.js";
import { eq } from "drizzle-orm";

const SOURCE_URL = "https://www.spotrac.com/nba/brooklyn-nets/yearly/";
const TRANSACTIONS_URL = "https://www.spotrac.com/nba/transactions/_/team/bkn";
const TEAM_ID = "BRK";
const SPOTRAC_TEAM_SLUG = "brooklyn-nets";

const packageDir = dirname(fileURLToPath(import.meta.url));
const rawHtmlPath = resolve(packageDir, "../../../data/raw/spotrac-bkn-yearly.html");
const rawTransactionsHtmlPath = resolve(packageDir, "../../../data/raw/spotrac-bkn-transactions.html");

async function fetchHtml(url: string, cachePath: string, useCache: boolean): Promise<string> {
  if (useCache) {
    const { readFileSync, existsSync } = await import("node:fs");
    if (existsSync(cachePath)) {
      return readFileSync(cachePath, "utf-8");
    }
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "nets-front-office/0.1 (local cap ingest; contact: dev@localhost)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, html, "utf-8");
  return html;
}

async function main() {
  const useCache = process.argv.includes("--cache");
  const useSeed = process.argv.includes("--seed");
  const db = createDb();

  let metrics: Awaited<ReturnType<typeof parseSpotracYearlyHtml>>;
  let playerRows: Awaited<ReturnType<typeof parseSpotracPlayerTables>>;
  let transactionRows: Awaited<ReturnType<typeof parseSpotracTransactionsHtml>> = [];
  let teamLogoUrl: string | null = null;

  if (useSeed) {
    const seedPath = resolve(packageDir, "../../../data/seed/spotrac-bkn-cap.json");
    const playerSeedPath = resolve(packageDir, "../../../data/seed/spotrac-bkn-players.json");
    const { readFileSync, existsSync } = await import("node:fs");
    metrics = JSON.parse(readFileSync(seedPath, "utf-8"));
    if (existsSync(playerSeedPath)) {
      playerRows = JSON.parse(readFileSync(playerSeedPath, "utf-8"));
    } else {
      const html = readFileSync(rawHtmlPath, "utf-8");
      playerRows = await parseSpotracPlayerTables(html);
      teamLogoUrl = parseSpotracTeamLogo(html, SPOTRAC_TEAM_SLUG);
    }
    if (!teamLogoUrl && existsSync(rawHtmlPath)) {
      teamLogoUrl = parseSpotracTeamLogo(readFileSync(rawHtmlPath, "utf-8"), SPOTRAC_TEAM_SLUG);
    }
    if (existsSync(rawTransactionsHtmlPath)) {
      transactionRows = await parseSpotracTransactionsHtml(readFileSync(rawTransactionsHtmlPath, "utf-8"));
    } else if (existsSync(rawHtmlPath)) {
      transactionRows = await parseSpotracTransactionsHtml(readFileSync(rawHtmlPath, "utf-8"));
    }
    console.log(`Loaded ${metrics.length} cap metrics and ${playerRows.length} player cap rows from seed/cache.`);
  } else {
    console.log(`Fetching Spotrac cap data from ${SOURCE_URL}${useCache ? " (cache allowed)" : ""}...`);
    const html = await fetchHtml(SOURCE_URL, rawHtmlPath, useCache);
    metrics = await parseSpotracYearlyHtml(html);
    playerRows = await parseSpotracPlayerTables(html);
    teamLogoUrl = parseSpotracTeamLogo(html, SPOTRAC_TEAM_SLUG);

    try {
      console.log(`Fetching Spotrac transactions from ${TRANSACTIONS_URL}${useCache ? " (cache allowed)" : ""}...`);
      const transactionsHtml = await fetchHtml(TRANSACTIONS_URL, rawTransactionsHtmlPath, useCache);
      transactionRows = await parseSpotracTransactionsHtml(transactionsHtml);
    } catch (error) {
      console.warn("Failed to fetch dedicated transactions page; falling back to yearly page widget.", error);
      transactionRows = await parseSpotracTransactionsHtml(html);
    }
  }

  if (transactionRows.length === 0 && !useSeed) {
    console.warn("No team transactions parsed from Spotrac.");
  } else {
    console.log(`Parsed ${transactionRows.length} team transactions.`);
  }

  const thresholdMetrics = metrics.filter((row) =>
    (CAP_THRESHOLD_METRICS as readonly string[]).includes(row.metric),
  );

  if (thresholdMetrics.length === 0) {
    throw new Error("No cap threshold metrics parsed. Try --seed or re-fetch without --cache.");
  }

  if (playerRows.length === 0) {
    throw new Error("No player cap rows parsed. Check data/raw/spotrac-bkn-yearly.html.");
  }

  console.log(`Parsed ${thresholdMetrics.length} threshold metrics and ${playerRows.length} player cap rows.`);

  await db
    .insert(teams)
    .values({
      id: TEAM_ID,
      name: "Brooklyn Nets",
      abbreviation: "BRK",
      brefSlug: "BRK",
      logoUrl: teamLogoUrl ?? BROOKLYN_NETS_LOGO_URL,
    })
    .onConflictDoUpdate({
      target: teams.id,
      set: {
        logoUrl: teamLogoUrl ?? BROOKLYN_NETS_LOGO_URL,
      },
    });

  const rosterPlayers = await db.query.players.findMany({
    where: eq(players.currentTeamId, TEAM_ID),
  });
  const playerIdByName = new Map(
    rosterPlayers.map((player) => [normalizePlayerName(player.fullName), player.id]),
  );
  const nbaPlayerIdByPlayerId = new Map(
    rosterPlayers.map((player) => [player.id, player.nbaPlayerId]),
  );

  const uniquePlayers = new Map<
    string,
    { spotracId: string; displayName: string; category: string; playerId: string | null }
  >();
  for (const row of playerRows) {
    const key = `${row.category}:${row.spotracId}`;
    if (!uniquePlayers.has(key)) {
      uniquePlayers.set(key, {
        spotracId: row.spotracId,
        displayName: row.displayName,
        category: row.category,
        playerId: playerIdByName.get(normalizePlayerName(row.displayName)) ?? null,
      });
    }
  }

  const resolvedHeadshots = new Map<
    string,
    { nbaPlayerId: string | null; headshotUrl: string | null }
  >();

  for (const player of uniquePlayers.values()) {
    let nbaPlayerId = player.playerId ? (nbaPlayerIdByPlayerId.get(player.playerId) ?? null) : null;

    if (!nbaPlayerId) {
      nbaPlayerId = await resolveNbaPlayerIdByName(player.displayName, useCache);
    }

    const headshotUrl =
      resolveHeadshotUrl({
        nbaPlayerId,
        brefSlug: player.playerId,
        spotracId: player.spotracId,
      }) ?? spotracHeadshotUrl(player.spotracId);

    resolvedHeadshots.set(`${player.category}:${player.spotracId}`, { nbaPlayerId, headshotUrl });

    if (player.playerId && nbaPlayerId) {
      await db
        .update(players)
        .set({ nbaPlayerId, headshotUrl })
        .where(eq(players.id, player.playerId));
    }
  }

  for (const row of thresholdMetrics) {
    await db
      .insert(teamCapMetrics)
      .values({
        teamId: TEAM_ID,
        season: row.season,
        metric: row.metric,
        amountCents: row.amountCents,
      })
      .onConflictDoUpdate({
        target: [teamCapMetrics.teamId, teamCapMetrics.season, teamCapMetrics.metric],
        set: { amountCents: row.amountCents },
      });
  }

  await db.delete(playerCapSeasons).where(eq(playerCapSeasons.teamId, TEAM_ID));

  for (const row of playerRows) {
    const playerId = playerIdByName.get(normalizePlayerName(row.displayName)) ?? null;
    const resolved = resolvedHeadshots.get(`${row.category}:${row.spotracId}`);

    await db.insert(playerCapSeasons).values({
      teamId: TEAM_ID,
      spotracId: row.spotracId,
      displayName: row.displayName,
      playerId,
      position: row.position,
      age: row.age,
      category: row.category,
      season: row.season,
      capHitCents: row.capHitCents,
      contractLabel: row.contractLabel,
      contractType: row.contractType,
      nbaPlayerId: resolved?.nbaPlayerId ?? null,
      headshotUrl: resolved?.headshotUrl ?? spotracHeadshotUrl(row.spotracId),
    });
  }

  await db.delete(teamTransactions).where(eq(teamTransactions.teamId, TEAM_ID));

  for (const row of transactionRows) {
    await db.insert(teamTransactions).values({
      teamId: TEAM_ID,
      transactionDate: row.transactionDate,
      playerName: row.playerName,
      spotracPlayerId: row.spotracPlayerId,
      transactionType: row.transactionType,
      description: row.description,
    });
  }

  await db.insert(capIngestRuns).values({
    sourceUrl: SOURCE_URL,
    rowCount: thresholdMetrics.length + playerRows.length + transactionRows.length,
  });

  const activeCount = new Set(
    playerRows.filter((row) => row.category === "active").map((row) => row.spotracId),
  ).size;
  const capHoldCount = new Set(
    playerRows.filter((row) => row.category === "cap_hold").map((row) => row.spotracId),
  ).size;

  const seasons = [...new Set(thresholdMetrics.map((m) => m.season))].sort();
  console.log(
    `Cap ingest complete: ${activeCount} active + ${capHoldCount} cap-hold players across ${seasons.join(", ")}.`,
  );
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
