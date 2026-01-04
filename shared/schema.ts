import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, unique, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Historical Prices Table
export const historicalPrices = pgTable("historical_prices", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(), 
  date: date("date").notNull(),
  open_price: decimal("open_price", { precision: 12, scale: 2 }),
  high_price: decimal("high_price", { precision: 12, scale: 2 }),
  low_price: decimal("low_price", { precision: 12, scale: 2 }),
  close_price: decimal("close_price", { precision: 12, scale: 2 }),
  volume: bigint("volume", { mode: "number" }),
  rsi: decimal("rsi", { precision: 5, scale: 2 }),
  moving_avg_50: decimal("moving_avg_50", { precision: 12, scale: 2 }),
}, (t) => ({
  unq: unique().on(t.ticker, t.date),
}));

// Predictions Table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  prediction: text("prediction").notNull(),
  confidence: integer("confidence").notNull(),
  target_price: decimal("target_price", { precision: 10, scale: 2 }),
  timeframe: text("timeframe").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  outcome: text("outcome"), // 'WIN' or 'LOSS'
  outcome_price: decimal("outcome_price", { precision: 10, scale: 2 }), // Price when outcome was determined
  outcome_date: timestamp("outcome_date"), // When outcome was determined
  learning_metadata: jsonb("learning_metadata"), // AI lessons learned from historical simulation
}, (t) => ({
  // Prevent duplicate predictions for same symbol on same day
  unq: unique().on(t.symbol, sql`DATE(${t.created_at})`),
}));

// Predictions History Table (audit trail for all graded predictions)
export const predictionsHistory = pgTable("predictions_history", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  prediction: text("prediction").notNull(),
  confidence: integer("confidence").notNull(),
  target_price: decimal("target_price", { precision: 10, scale: 2 }),
  timeframe: text("timeframe").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  outcome: text("outcome"), // 'WIN' or 'LOSS'
  outcome_price: decimal("outcome_price", { precision: 10, scale: 2 }), // Price when outcome was determined
  outcome_date: timestamp("outcome_date"), // When outcome was determined
  learning_metadata: jsonb("learning_metadata"), // AI learning insights from historical simulations
  moved_at: timestamp("moved_at").defaultNow(), // When record was archived
}, (t) => ({
  // Prevent duplicate historical records for same symbol on same day
  unq: unique().on(t.symbol, sql`DATE(${t.created_at})`),
}));

// Portfolios Table (personal watchlists)
export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(), // References users.id
  ticker_symbol: text("ticker_symbol").notNull(),
  added_at: timestamp("added_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.user_id, t.ticker_symbol), // Prevent duplicate tickers per user
}));

// Simulation Results Table (for back-testing historical predictions)
export const simulationResults = pgTable("simulation_results", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  simulation_date: timestamp("simulation_date").notNull(), // Date when simulation was run
  historical_date: timestamp("historical_date").notNull(), // Historical date being simulated
  price_at_prediction: decimal("price_at_prediction", { precision: 10, scale: 2 }),
  rsi_at_prediction: decimal("rsi_at_prediction", { precision: 5, scale: 2 }),
  rvol_at_prediction: decimal("rvol_at_prediction", { precision: 5, scale: 2 }),
  predicted_target: decimal("predicted_target", { precision: 10, scale: 2 }),
  confidence_score: integer("confidence_score"),
  actual_price_7_days: decimal("actual_price_7_days", { precision: 10, scale: 2 }), // Price 7 days later
  outcome: text("outcome"), // 'WIN' or 'LOSS' based on simulation
  error_percentage: decimal("error_percentage", { precision: 5, scale: 2 }), // |predicted - actual| / actual * 100
  bias_adjustments: jsonb("bias_adjustments"), // AI analysis of what went wrong/right
  created_at: timestamp("created_at").defaultNow(),
});

// Playbook Sections Table
export const playbookSections = pgTable("playbook_sections", {
  id: serial("id").primaryKey(),
  run_id: text("run_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  section_type: text("section_type").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  is_premium: boolean("is_premium").default(false),
  tier: text("tier").default("FREE"),
  isAdmin: boolean("is_admin").default(false),
});

// Type Definitions & Schemas
export const insertHistoricalPriceSchema = createInsertSchema(historicalPrices);
export type HistoricalPrice = typeof historicalPrices.$inferSelect;

export const insertPredictionSchema = createInsertSchema(predictions, {
  outcome: z.string().optional(),
  outcome_price: z.string().optional(),
  outcome_date: z.date().optional(),
  learning_metadata: z.any().optional(),
});
export type Prediction = typeof predictions.$inferSelect;

export const insertPredictionHistorySchema = createInsertSchema(predictionsHistory);
export type PredictionHistory = typeof predictionsHistory.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertPortfolioSchema = createInsertSchema(portfolios);
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;

export const insertPlaybookSectionSchema = createInsertSchema(playbookSections);
export type PlaybookSection = typeof playbookSections.$inferSelect;

export const insertSimulationResultSchema = createInsertSchema(simulationResults);
export type SimulationResult = typeof simulationResults.$inferSelect;
export type InsertPlaybookSection = typeof playbookSections.$inferInsert;