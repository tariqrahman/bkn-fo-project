import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./compute-cap-room.js";

const packageDir = dirname(fileURLToPath(import.meta.url));
const brefPlayersDir = resolve(packageDir, "../../../data/raw/bref-players");
const brefSearchDir = resolve(packageDir, "../../../data/raw/bref-search");

const BREF_HEADERS = {
  "User-Agent": "nets-front-office/0.1 (local data ingest; contact: dev@localhost)",
};

export function parseNbaPlayerIdFromHtml(html: string): string | null {
  const match = html.match(/nba\.com\/player\/(\d+)/i);
  return match?.[1] ?? null;
}

function cachePathForSlug(brefSlug: string): string {
  return resolve(brefPlayersDir, `${brefSlug}.html`);
}

function cachePathForSearch(name: string): string {
  const key = normalizePlayerName(name).replace(/[^a-z0-9]+/g, "-");
  return resolve(brefSearchDir, `${key || "unknown"}.html`);
}

async function fetchCachedHtml(
  url: string,
  cachePath: string,
  useCache: boolean,
): Promise<string | null> {
  if (useCache && existsSync(cachePath)) {
    return readFileSync(cachePath, "utf-8");
  }

  try {
    const response = await fetch(url, { headers: BREF_HEADERS });
    if (!response.ok) return null;

    const html = await response.text();
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, html, "utf-8");
    return html;
  } catch {
    return null;
  }
}

export async function resolveNbaPlayerIdFromBrefSlug(
  brefSlug: string,
  useCache: boolean,
): Promise<string | null> {
  const url = `https://www.basketball-reference.com/players/${brefSlug.charAt(0)}/${brefSlug}.html`;
  const html = await fetchCachedHtml(url, cachePathForSlug(brefSlug), useCache);
  if (!html) return null;
  return parseNbaPlayerIdFromHtml(html);
}

function parseFirstBrefSlugFromSearchHtml(html: string): string | null {
  const match = html.match(/href='\/players\/[a-z]\/([a-z0-9]+)\.html'/i);
  return match?.[1] ?? null;
}

export async function resolveNbaPlayerIdByName(
  displayName: string,
  useCache: boolean,
): Promise<string | null> {
  const searchUrl = `https://www.basketball-reference.com/search/search.fcgi?search=${encodeURIComponent(displayName)}`;
  const searchHtml = await fetchCachedHtml(searchUrl, cachePathForSearch(displayName), useCache);
  if (!searchHtml) return null;

  const brefSlug = parseFirstBrefSlugFromSearchHtml(searchHtml);
  if (!brefSlug) return null;

  return resolveNbaPlayerIdFromBrefSlug(brefSlug, useCache);
}

export async function resolveNbaPlayerIdForPlayer(
  options: { brefSlug?: string | null; displayName: string },
  useCache: boolean,
): Promise<string | null> {
  if (options.brefSlug) {
    const fromSlug = await resolveNbaPlayerIdFromBrefSlug(options.brefSlug, useCache);
    if (fromSlug) return fromSlug;
  }

  return resolveNbaPlayerIdByName(options.displayName, useCache);
}
