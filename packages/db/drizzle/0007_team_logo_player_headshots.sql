ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "headshot_url" text;
ALTER TABLE "player_cap_seasons" ADD COLUMN IF NOT EXISTS "headshot_url" text;
