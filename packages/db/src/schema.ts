import { relations } from "drizzle-orm";
import { bigint, boolean, date, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  brefSlug: text("bref_slug").notNull(),
  logoUrl: text("logo_url"),
});

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  currentTeamId: text("current_team_id")
    .notNull()
    .references(() => teams.id),
  age: integer("age"),
  headshotUrl: text("headshot_url"),
  nbaPlayerId: text("nba_player_id"),
});

export const contractSeasons = pgTable(
  "contract_seasons",
  {
    id: serial("id").primaryKey(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    season: text("season").notNull(),
    salaryCents: bigint("salary_cents", { mode: "number" }),
    guaranteedCents: bigint("guaranteed_cents", { mode: "number" }),
    optionType: text("option_type", { enum: ["player", "team"] }),
  },
  (table) => [uniqueIndex("contract_seasons_unique").on(table.playerId, table.teamId, table.season)],
);

export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  rowCount: integer("row_count").notNull(),
});

export const teamCapMetrics = pgTable(
  "team_cap_metrics",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    season: text("season").notNull(),
    metric: text("metric").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }),
  },
  (table) => [uniqueIndex("team_cap_metrics_unique").on(table.teamId, table.season, table.metric)],
);

export const capIngestRuns = pgTable("cap_ingest_runs", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  rowCount: integer("row_count").notNull(),
});

export const teamInsightsCache = pgTable("team_insights_cache", {
  teamId: text("team_id")
    .primaryKey()
    .references(() => teams.id),
  cacheKey: text("cache_key").notNull(),
  payload: jsonb("payload").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playerCapSeasons = pgTable(
  "player_cap_seasons",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    spotracId: text("spotrac_id").notNull(),
    displayName: text("display_name").notNull(),
    playerId: text("player_id").references(() => players.id),
    position: text("position"),
    age: integer("age"),
    category: text("category", { enum: ["active", "cap_hold"] }).notNull(),
    season: text("season").notNull(),
    capHitCents: bigint("cap_hit_cents", { mode: "number" }),
    contractLabel: text("contract_label"),
    contractType: text("contract_type", {
      enum: ["player_option", "team_option", "mutual_option", "ufa", "rfa", "erfa", "two_way"],
    }),
    headshotUrl: text("headshot_url"),
    nbaPlayerId: text("nba_player_id"),
  },
  (table) => [
    uniqueIndex("player_cap_seasons_unique").on(
      table.teamId,
      table.spotracId,
      table.season,
      table.category,
    ),
  ],
);

export const teamTransactions = pgTable(
  "team_transactions",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    transactionDate: date("transaction_date").notNull(),
    playerName: text("player_name").notNull(),
    spotracPlayerId: text("spotrac_player_id"),
    transactionType: text("transaction_type").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    uniqueIndex("team_transactions_unique").on(
      table.teamId,
      table.transactionDate,
      table.playerName,
      table.transactionType,
      table.description,
    ),
  ],
);

export const teamDepthChartSlots = pgTable(
  "team_depth_chart_slots",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    season: text("season").notNull(),
    roleLabel: text("role_label").notNull(),
    roleOrder: integer("role_order").notNull(),
    position: text("position").notNull(),
    realgmPlayerId: text("realgm_player_id"),
    displayName: text("display_name").notNull(),
    playerId: text("player_id").references(() => players.id),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("team_depth_chart_slots_unique").on(
      table.teamId,
      table.season,
      table.roleOrder,
      table.position,
    ),
  ],
);

export const depthChartIngestRuns = pgTable("depth_chart_ingest_runs", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  rowCount: integer("row_count").notNull(),
});

export const teamDraftPickEntries = pgTable(
  "team_draft_pick_entries",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    draftYear: integer("draft_year").notNull(),
    round: integer("round").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    label: text("label").notNull(),
    starred: boolean("starred").notNull().default(false),
    isTraded: boolean("is_traded").notNull().default(false),
    noteRefs: jsonb("note_refs").notNull().$type<number[]>().default([]),
  },
  (table) => [
    uniqueIndex("team_draft_pick_entries_unique").on(
      table.teamId,
      table.draftYear,
      table.round,
      table.sortOrder,
    ),
  ],
);

export const teamDraftPickRoundMeta = pgTable(
  "team_draft_pick_round_meta",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    round: integer("round").notNull(),
    tradeableCount: integer("tradeable_count").notNull(),
  },
  (table) => [uniqueIndex("team_draft_pick_round_meta_unique").on(table.teamId, table.round)],
);

export const teamDraftPickNotes = pgTable(
  "team_draft_pick_notes",
  {
    id: serial("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    noteNumber: integer("note_number").notNull(),
    noteText: text("note_text").notNull(),
  },
  (table) => [uniqueIndex("team_draft_pick_notes_unique").on(table.teamId, table.noteNumber)],
);

export const draftPicksIngestRuns = pgTable("draft_picks_ingest_runs", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  rowCount: integer("row_count").notNull(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  players: many(players),
  contractSeasons: many(contractSeasons),
  playerCapSeasons: many(playerCapSeasons),
  transactions: many(teamTransactions),
  depthChartSlots: many(teamDepthChartSlots),
  draftPickEntries: many(teamDraftPickEntries),
  draftPickNotes: many(teamDraftPickNotes),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.currentTeamId],
    references: [teams.id],
  }),
  contractSeasons: many(contractSeasons),
}));

export const contractSeasonsRelations = relations(contractSeasons, ({ one }) => ({
  player: one(players, {
    fields: [contractSeasons.playerId],
    references: [players.id],
  }),
  team: one(teams, {
    fields: [contractSeasons.teamId],
    references: [teams.id],
  }),
}));

export const playerCapSeasonsRelations = relations(playerCapSeasons, ({ one }) => ({
  player: one(players, {
    fields: [playerCapSeasons.playerId],
    references: [players.id],
  }),
  team: one(teams, {
    fields: [playerCapSeasons.teamId],
    references: [teams.id],
  }),
}));

export const teamTransactionsRelations = relations(teamTransactions, ({ one }) => ({
  team: one(teams, {
    fields: [teamTransactions.teamId],
    references: [teams.id],
  }),
}));

export const teamDepthChartSlotsRelations = relations(teamDepthChartSlots, ({ one }) => ({
  player: one(players, {
    fields: [teamDepthChartSlots.playerId],
    references: [players.id],
  }),
  team: one(teams, {
    fields: [teamDepthChartSlots.teamId],
    references: [teams.id],
  }),
}));

export const teamDraftPickEntriesRelations = relations(teamDraftPickEntries, ({ one }) => ({
  team: one(teams, {
    fields: [teamDraftPickEntries.teamId],
    references: [teams.id],
  }),
}));

export const teamDraftPickNotesRelations = relations(teamDraftPickNotes, ({ one }) => ({
  team: one(teams, {
    fields: [teamDraftPickNotes.teamId],
    references: [teams.id],
  }),
}));
