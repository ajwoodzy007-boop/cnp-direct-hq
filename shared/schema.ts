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
  outcome: (schema) => schema.optional(), // Allow null/undefined for ungraded predictions
  outcome_price: (schema) => schema.optional(),
  outcome_date: (schema) => schema.optional(),
});
export type Prediction = typeof predictions.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertPlaybookSectionSchema = createInsertSchema(playbookSections);
export type PlaybookSection = typeof playbookSections.$inferSelect;
export type InsertPlaybookSection = typeof playbookSections.$inferInsert;