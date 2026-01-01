import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, unique, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// 1. AUTH & USER TABLES
// ============================================
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  is_premium: boolean("is_premium").default(false),
  tier: text("tier").default("FREE"),
  isAdmin: boolean("is_admin").default(false), // Added for your Admin Dashboard access
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  bio: text("bio"),
  avatar_url: text("avatar_url"),
});

export const userPortfolio = pgTable("user_portfolio", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  symbol: text("symbol").notNull(),
  shares: decimal("shares", { precision: 10, scale: 2 }),
});

// ============================================
// 2. PREDICTION & ORACLE TABLES
// ============================================
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  prediction: text("prediction").notNull(),
  confidence: integer("confidence").notNull(),
  target_price: decimal("target_price", { precision: 10, scale: 2 }),
  timeframe: text("timeframe").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const dailyPredictionRuns = pgTable("daily_prediction_runs", {
  id: serial("id").primaryKey(),
  run_date: timestamp("run_date").defaultNow(),
  status: text("status").notNull(),
});

export const dailyPredictionEntries = pgTable("daily_prediction_entries", {
  id: serial("id").primaryKey(),
  run_id: integer("run_id").references(() => dailyPredictionRuns.id),
  symbol: text("symbol").notNull(),
  signal: text("signal").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  target: decimal("target", { precision: 10, scale: 2 }),
});

// ============================================
// 3. AI INSIGHTS & METRICS
// ============================================
export const aiPlaybookRuns = pgTable("ai_playbook_runs", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const playbookSections = pgTable("playbook_sections", {
  id: serial("id").primaryKey(),
  run_id: integer("run_id").references(() => aiPlaybookRuns.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

export const cachedMarketMetrics = pgTable("cached_market_metrics", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  data: jsonb("data").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const aiSignalInsights = pgTable("ai_signal_insights", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  insight: text("insight").notNull(),
  score: integer("score"),
});

export const aiPredictionScores = pgTable("ai_prediction_scores", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  accuracy_score: integer("accuracy_score"),
});

export const aiModelMetrics = pgTable("ai_model_metrics", {
  id: serial("id").primaryKey(),
  model_name: text("model_name").notNull(),
  performance_data: jsonb("performance_data"),
  last_trained: timestamp("last_trained").defaultNow(),
});

// ============================================
// 4. THE LEARNING ENGINE (NEW: 6-Month Baseline)
// ============================================
export const historicalPrices = pgTable("historical_prices", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  date: date("date").notNull(),
  open_price: decimal("open_price", { precision: 12, scale: 2 }),
  high_price: decimal("high_price", { precision: 12, scale: 2 }),
  low_price: decimal("low_price", { precision: 12, scale: 2 }),
  close_price: decimal("close_price", { precision: 12, scale: 2 }),
  volume: bigint("volume", { mode: "number" }),
  rsi: decimal("rsi", { precision: 5, scale: 2 }),
  moving_avg_50: decimal("moving_avg_50", { precision: 12, scale: 2 }),
}, (t) => ({
  unq: unique().on(t.symbol, t.date),
}));

// ============================================
// 5. SCHEMAS & TYPES
// ============================================
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, created_at: true });
export const insertAiModelMetricSchema = createInsertSchema(aiModelMetrics);
export const insertHistoricalPriceSchema = createInsertSchema(historicalPrices);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type AiModelMetric = typeof aiModelMetrics.$inferSelect;
export type InsertAiModelMetric = z.infer<typeof insertAiModelMetricSchema>;
export type HistoricalPrice = typeof historicalPrices.$inferSelect;
export type InsertHistoricalPrice = z.infer<typeof insertHistoricalPriceSchema>;