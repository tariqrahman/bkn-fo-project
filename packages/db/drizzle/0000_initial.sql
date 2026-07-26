CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"bref_slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"current_team_id" text NOT NULL,
	"age" integer,
	"bref_slug" text
);
--> statement-breakpoint
CREATE TABLE "contract_seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"team_id" text NOT NULL,
	"season" text NOT NULL,
	"salary_cents" integer,
	"guaranteed_cents" integer,
	"option_type" text
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_seasons" ADD CONSTRAINT "contract_seasons_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_seasons" ADD CONSTRAINT "contract_seasons_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_seasons_unique" ON "contract_seasons" USING btree ("player_id","team_id","season");
