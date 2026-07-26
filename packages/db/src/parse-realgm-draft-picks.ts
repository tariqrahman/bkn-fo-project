import * as cheerio from "cheerio";

export interface ParsedDraftPickEntry {
  draftYear: number;
  round: 1 | 2;
  sortOrder: number;
  label: string;
  starred: boolean;
  isTraded: boolean;
  noteRefs: number[];
}

export interface ParsedDraftPickNote {
  noteNumber: number;
  noteText: string;
}

export interface ParsedDraftPicks {
  years: number[];
  entries: ParsedDraftPickEntry[];
  tradeableByRound: Partial<Record<1 | 2, number>>;
  notes: ParsedDraftPickNote[];
}

function parseYearHeader(text: string): number | null {
  const match = text.trim().match(/^(\d{4})$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseRoundLabel(text: string): 1 | 2 | null {
  const normalized = text.trim().toUpperCase();
  if (normalized === "R1" || normalized === "1") return 1;
  if (normalized === "R2" || normalized === "2") return 2;
  return null;
}

function extractNoteRefs($: cheerio.CheerioAPI, element: cheerio.Element): number[] {
  const refs = new Set<number>();
  $(element)
    .find("sup")
    .each((_, sup) => {
      const value = Number.parseInt($(sup).text().trim(), 10);
      if (!Number.isNaN(value)) refs.add(value);
    });
  return [...refs].sort((a, b) => a - b);
}

function normalizePickLabel(raw: string): { label: string; starred: boolean; noteRefs: number[] } {
  let label = raw.replace(/\s+/g, " ").trim();
  let starred = false;

  if (label.startsWith("*")) {
    starred = true;
    label = label.replace(/^\*\s*/, "").trim();
  }

  const trailingNoteMatch = label.match(/^(.*?)(\d+)$/);
  if (trailingNoteMatch && /[A-Z]{2,4}$/.test(trailingNoteMatch[1].trim())) {
    label = trailingNoteMatch[1].trim();
    return { label, starred, noteRefs: [Number.parseInt(trailingNoteMatch[2], 10)] };
  }

  return { label, starred, noteRefs: [] };
}

function parsePickListItem(
  $: cheerio.CheerioAPI,
  element: cheerio.Element,
): Omit<ParsedDraftPickEntry, "draftYear" | "round" | "sortOrder"> {
  const $item = $(element);
  const htmlNoteRefs = extractNoteRefs($, element);
  $item.find("sup").remove();
  const rawText = $item.text();
  const normalized = normalizePickLabel(rawText);
  const className = $item.attr("class") ?? "";
  const isTraded =
    /\b(traded|outgoing|sent)\b/i.test(className) || /^to\s+/i.test(normalized.label);

  return {
    label: normalized.label,
    starred: normalized.starred || /\bstarred\b/i.test(className),
    isTraded,
    noteRefs: [...new Set([...normalized.noteRefs, ...htmlNoteRefs])].sort((a, b) => a - b),
  };
}

function parsePickCell(
  cellHtml: string,
  draftYear: number,
  round: 1 | 2,
): ParsedDraftPickEntry[] {
  const $doc = cheerio.load(`<table><tr><td>${cellHtml}</td></tr></table>`);
  const items = $doc("td li").toArray();

  if (items.length === 0) {
    const text = $doc("td").text().replace(/\s+/g, " ").trim();
    if (!text) return [];

    return text.split(/\s*;\s*/).flatMap((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return [];
      const parsed = normalizePickLabel(trimmed);
      return [
        {
          draftYear,
          round,
          sortOrder: index,
          label: parsed.label,
          starred: parsed.starred,
          isTraded: /^to\s+/i.test(parsed.label),
          noteRefs: parsed.noteRefs,
        },
      ];
    });
  }

  return items.map((item, index) => ({
    draftYear,
    round,
    sortOrder: index,
    ...parsePickListItem($doc, item),
  }));
}

function findPicksTable($: cheerio.CheerioAPI): cheerio.Element | null {
  const heading = $("h2, h3, h4")
    .filter((_, element) => /\bpicks\b/i.test($(element).text()))
    .first();

  if (heading.length > 0) {
    let next = heading.next();
    while (next.length > 0 && next[0]?.tagName !== "table") {
      next = next.next();
    }
    if (next[0]?.tagName === "table") return next[0];
  }

  let match: cheerio.Element | null = null;
  $("table").each((_, table) => {
    const headerText = $(table).find("tr").first().text();
    if (headerText.includes("Tradeable") && (headerText.includes("R1") || headerText.includes("2027"))) {
      match = table;
    }
  });
  return match;
}

function parsePicksTable($: cheerio.CheerioAPI, table: cheerio.Element): ParsedDraftPicks {
  const rows = $(table).find("tr").toArray();
  if (rows.length === 0) {
    throw new Error("Draft picks table has no rows.");
  }

  const headerCells = $(rows[0])
    .find("th, td")
    .toArray()
    .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());

  const years: number[] = [];
  const columnMeta: Array<{ kind: "year"; year: number } | { kind: "tradeable" }> = [];

  for (let index = 1; index < headerCells.length; index += 1) {
    const header = headerCells[index];
    if (/tradeable/i.test(header)) {
      columnMeta.push({ kind: "tradeable" });
      continue;
    }
    const year = parseYearHeader(header);
    if (year) {
      years.push(year);
      columnMeta.push({ kind: "year", year });
    }
  }

  const entries: ParsedDraftPickEntry[] = [];
  const tradeableByRound: Partial<Record<1 | 2, number>> = {};

  for (const row of rows.slice(1)) {
    const cells = $(row)
      .find("th, td")
      .toArray()
      .map((cell) => $(cell).html()?.trim() ?? "");
    const textCells = $(row)
      .find("th, td")
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());

    const round = parseRoundLabel(textCells[0] ?? "");
    if (!round) continue;

    for (let index = 0; index < columnMeta.length; index += 1) {
      const meta = columnMeta[index];
      const cellHtml = cells[index + 1] ?? "";
      const cellText = textCells[index + 1] ?? "";

      if (meta.kind === "tradeable") {
        const count = Number.parseInt(cellText, 10);
        if (!Number.isNaN(count)) tradeableByRound[round] = count;
        continue;
      }

      entries.push(...parsePickCell(cellHtml, meta.year, round));
    }
  }

  return { years, entries, tradeableByRound, notes: [] };
}

function parseNotes($: cheerio.CheerioAPI, table: cheerio.Element): ParsedDraftPickNote[] {
  let notesRoot = $(table).nextAll("ol.draft-pick-notes, ul.draft-pick-notes").first();
  if (notesRoot.length === 0) {
    notesRoot = $("h3, h4")
      .filter((_, element) => /notes/i.test($(element).text()))
      .first()
      .next("ol, ul");
  }

  if (notesRoot.length === 0) return [];

  return notesRoot
    .find("li")
    .toArray()
    .map((item, index) => ({
      noteNumber: index + 1,
      noteText: $(item).text().replace(/\s+/g, " ").trim(),
    }))
    .filter((note) => note.noteText.length > 0);
}

export function parseRealgmDraftPicksHtml(html: string): ParsedDraftPicks {
  const $ = cheerio.load(html);
  const table = findPicksTable($);
  if (!table) {
    throw new Error("Could not find draft picks table in RealGM HTML.");
  }

  const parsed = parsePicksTable($, table);
  parsed.notes = parseNotes($, table);
  return parsed;
}
