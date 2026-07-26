import { normalizePlayerName } from "./compute-cap-room.js";

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

/** Convert a RealGM player URL slug to a display name (e.g. Michael-Porter-Jr → Michael Porter Jr.). */
export function realgmSlugToFullName(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  const words: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (NAME_SUFFIXES.has(lower) && words.length > 0) {
      words[words.length - 1] = `${words[words.length - 1]} ${part}.`;
    } else {
      words.push(part);
    }
  }

  return words.join(" ");
}

export interface RosterNameCandidate {
  playerId: string | null;
  fullName: string;
}

/** Match a RealGM abbreviated label or slug-derived name to a roster player. */
export function matchRealgmPlayerName(
  abbreviatedName: string,
  slugFullName: string | null,
  candidates: RosterNameCandidate[],
): RosterNameCandidate | null {
  const normalizedCandidates = candidates.map((candidate) => ({
    ...candidate,
    normalized: normalizePlayerName(candidate.fullName),
  }));

  if (slugFullName) {
    const normalizedSlug = normalizePlayerName(slugFullName);
    const slugMatch = normalizedCandidates.find((candidate) => candidate.normalized === normalizedSlug);
    if (slugMatch) return slugMatch;

    const slugLast = lastNameToken(normalizedSlug);
    const slugFirstInitial = normalizedSlug[0];
    const slugMatches = normalizedCandidates.filter(
      (candidate) =>
        lastNameToken(candidate.normalized) === slugLast && candidate.normalized[0] === slugFirstInitial,
    );
    if (slugMatches.length === 1) return slugMatches[0];
  }

  const parsed = parseAbbreviatedName(abbreviatedName);
  if (!parsed) return null;

  const matches = normalizedCandidates.filter((candidate) => {
    const last = lastNameToken(candidate.normalized);
    const firstInitial = candidate.normalized[0];
    return last === parsed.lastName && firstInitial === parsed.firstInitial;
  });

  if (matches.length === 1) return matches[0];

  const lastNameOnly = normalizedCandidates.filter(
    (candidate) => lastNameToken(candidate.normalized) === parsed.lastName,
  );
  if (lastNameOnly.length === 1) return lastNameOnly[0];

  return null;
}

function parseAbbreviatedName(name: string): { firstInitial: string; lastName: string } | null {
  const cleaned = name.replace(/,\s*(Jr\.|Sr\.|III|II|IV)/gi, "").trim();
  const match = cleaned.match(/^([A-Za-z])\.?\s+(.+)$/);
  if (!match) return null;

  const firstInitial = match[1].toLowerCase();
  let lastSegment = match[2].trim();
  lastSegment = lastSegment.replace(/\s+(Jr\.|Sr\.|III|II|IV)$/i, "").trim();

  return {
    firstInitial,
    lastName: normalizePlayerName(lastSegment).split(/\s+/).pop() ?? "",
  };
}

function lastNameToken(normalizedFullName: string): string {
  const parts = normalizedFullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1];
  if (NAME_SUFFIXES.has(last) && parts.length > 1) {
    return parts[parts.length - 2];
  }
  return last;
}
