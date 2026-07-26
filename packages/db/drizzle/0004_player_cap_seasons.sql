CREATE TABLE IF NOT EXISTS "player_cap_seasons" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "teams"("id"),
  "spotrac_id" text NOT NULL,
  "display_name" text NOT NULL,
  "player_id" text REFERENCES "players"("id"),
  "position" text,
  "age" integer,
  "category" text NOT NULL,
  "season" text NOT NULL,
  "cap_hit_cents" bigint,
  "contract_label" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "player_cap_seasons_unique"
  ON "player_cap_seasons" ("team_id", "spotrac_id", "season", "category");
