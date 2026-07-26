CREATE TABLE "team_cap_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"season" text NOT NULL,
	"metric" text NOT NULL,
	"amount_cents" bigint
);
--> statement-breakpoint
CREATE TABLE "cap_ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_cap_metrics" ADD CONSTRAINT "team_cap_metrics_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_cap_metrics_unique" ON "team_cap_metrics" USING btree ("team_id","season","metric");
