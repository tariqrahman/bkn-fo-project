CREATE TABLE IF NOT EXISTS "team_draft_pick_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "teams"("id"),
  "draft_year" integer NOT NULL,
  "round" integer NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "label" text NOT NULL,
  "starred" boolean NOT NULL DEFAULT false,
  "is_traded" boolean NOT NULL DEFAULT false,
  "note_refs" jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_draft_pick_entries_unique"
  ON "team_draft_pick_entries" ("team_id", "draft_year", "round", "sort_order");

CREATE TABLE IF NOT EXISTS "team_draft_pick_round_meta" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "teams"("id"),
  "round" integer NOT NULL,
  "tradeable_count" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_draft_pick_round_meta_unique"
  ON "team_draft_pick_round_meta" ("team_id", "round");

CREATE TABLE IF NOT EXISTS "team_draft_pick_notes" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "teams"("id"),
  "note_number" integer NOT NULL,
  "note_text" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_draft_pick_notes_unique"
  ON "team_draft_pick_notes" ("team_id", "note_number");

CREATE TABLE IF NOT EXISTS "draft_picks_ingest_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_url" text NOT NULL,
  "run_at" timestamp with time zone DEFAULT now() NOT NULL,
  "row_count" integer NOT NULL
);
