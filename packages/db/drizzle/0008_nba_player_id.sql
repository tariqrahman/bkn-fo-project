ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "nba_player_id" text;
ALTER TABLE "player_cap_seasons" ADD COLUMN IF NOT EXISTS "nba_player_id" text;
