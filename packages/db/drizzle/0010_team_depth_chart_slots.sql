CREATE TABLE IF NOT EXISTS "team_depth_chart_slots" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "teams"("id"),
  "season" text NOT NULL,
  "role_label" text NOT NULL,
  "role_order" integer NOT NULL,
  "position" text NOT NULL,
  "realgm_player_id" text,
  "display_name" text NOT NULL,
  "player_id" text REFERENCES "players"("id"),
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_depth_chart_slots_unique"
  ON "team_depth_chart_slots" ("team_id", "season", "role_order", "position");

CREATE TABLE IF NOT EXISTS "depth_chart_ingest_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_url" text NOT NULL,
  "run_at" timestamp with time zone DEFAULT now() NOT NULL,
  "row_count" integer NOT NULL
);
