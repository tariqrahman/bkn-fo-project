CREATE TABLE IF NOT EXISTS "team_insights_cache" (
  "team_id" text PRIMARY KEY NOT NULL REFERENCES "teams"("id"),
  "cache_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
