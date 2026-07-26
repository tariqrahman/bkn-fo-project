TRUNCATE TABLE "contract_seasons", "players" CASCADE;--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN IF EXISTS "bref_slug";
