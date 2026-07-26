CREATE TABLE IF NOT EXISTS "team_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "teams"("id"),
  "transaction_date" date NOT NULL,
  "player_name" text NOT NULL,
  "spotrac_player_id" text,
  "transaction_type" text NOT NULL,
  "description" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_transactions_unique"
  ON "team_transactions" ("team_id", "transaction_date", "player_name", "transaction_type", "description");
