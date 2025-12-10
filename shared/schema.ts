import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  signalType: text("signal_type").notNull(),
  entryPrice: real("entry_price").notNull(),
  predictionDate: timestamp("prediction_date").notNull().defaultNow(),
  outcome: text("outcome"),
  outcomePrice: real("outcome_price"),
  outcomeDate: timestamp("outcome_date"),
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  predictionDate: true,
  outcome: true,
  outcomePrice: true,
  outcomeDate: true,
});

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull().unique(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  addedAt: true,
});

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchlistItem = typeof watchlist.$inferSelect;

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  destination: text("destination").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
});

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
  clickedAt: true,
});

export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

export const weeklyRecommendations = pgTable("weekly_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  weekStart: timestamp("week_start").notNull(),
  signalType: text("signal_type").notNull(),
  entryPrice: real("entry_price").notNull(),
  currentPrice: real("current_price"),
  gainPercent: real("gain_percent"),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWeeklyRecommendationSchema = createInsertSchema(weeklyRecommendations).omit({
  id: true,
  createdAt: true,
});

export type InsertWeeklyRecommendation = z.infer<typeof insertWeeklyRecommendationSchema>;
export type WeeklyRecommendation = typeof weeklyRecommendations.$inferSelect;

// Historical prediction tracking - stores each day's Top 10 picks with outcomes
export const dailyPredictionRuns = pgTable("daily_prediction_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runDate: text("run_date").notNull().unique(), // YYYY-MM-DD format in ET
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at"),
  marketOpen: text("market_open").default("true"),
});

export const insertDailyPredictionRunSchema = createInsertSchema(dailyPredictionRuns).omit({
  id: true,
  generatedAt: true,
  finalizedAt: true,
});

export type InsertDailyPredictionRun = z.infer<typeof insertDailyPredictionRunSchema>;
export type DailyPredictionRun = typeof dailyPredictionRuns.$inferSelect;

export const dailyPredictionEntries = pgTable("daily_prediction_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull().references(() => dailyPredictionRuns.id),
  ticker: text("ticker").notNull(),
  confidence: real("confidence").notNull(),
  reasoning: text("reasoning"),
  entryPrice: real("entry_price").notNull(),
  predictedPrice: real("predicted_price"), // Target price prediction for end of day
  closePrice: real("close_price"),
  currentPrice: real("current_price"),
  closePnl: real("close_pnl"),
  totalPnl: real("total_pnl"),
  outcome: text("outcome"), // 'win' | 'loss' | 'pending' - based on predicted vs actual close
});

export const insertDailyPredictionEntrySchema = createInsertSchema(dailyPredictionEntries).omit({
  id: true,
});

export type InsertDailyPredictionEntry = z.infer<typeof insertDailyPredictionEntrySchema>;
export type DailyPredictionEntry = typeof dailyPredictionEntries.$inferSelect;

// ============================================
// AI PLAYBOOK PREMIUM FEATURE TABLES
// ============================================

// User profiles with subscription status and trading preferences
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionId: text("subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"), // 'free' | 'active' | 'cancelled' | 'past_due'
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  tradingStyle: text("trading_style").default("swing"), // 'day' | 'swing' | 'position' | 'scalping'
  riskTolerance: text("risk_tolerance").default("moderate"), // 'conservative' | 'moderate' | 'aggressive'
  experienceLevel: text("experience_level").default("intermediate"), // 'beginner' | 'intermediate' | 'advanced'
  preferredSectors: text("preferred_sectors").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// User portfolio holdings for portfolio optimization
export const userPortfolio = pgTable("user_portfolio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  ticker: text("ticker").notNull(),
  shares: real("shares").notNull(),
  averageCost: real("average_cost").notNull(),
  currentPrice: real("current_price"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPortfolioSchema = createInsertSchema(userPortfolio).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export type InsertUserPortfolio = z.infer<typeof insertUserPortfolioSchema>;
export type UserPortfolioItem = typeof userPortfolio.$inferSelect;

// AI Playbook generation runs - tracks each generation session
export const aiPlaybookRuns = pgTable("ai_playbook_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  playbookType: text("playbook_type").notNull(), // 'strategy' | 'briefing' | 'signals' | 'risk' | 'portfolio' | 'patterns' | 'earnings'
  status: text("status").notNull().default("pending"), // 'pending' | 'generating' | 'completed' | 'failed'
  inputData: jsonb("input_data"), // Input parameters used for generation
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // When this playbook result expires
});

export const insertAiPlaybookRunSchema = createInsertSchema(aiPlaybookRuns).omit({
  id: true,
  generatedAt: true,
  completedAt: true,
});

export type InsertAiPlaybookRun = z.infer<typeof insertAiPlaybookRunSchema>;
export type AiPlaybookRun = typeof aiPlaybookRuns.$inferSelect;

// Playbook sections - stores generated content for each feature
export const playbookSections = pgTable("playbook_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull().references(() => aiPlaybookRuns.id),
  sectionType: text("section_type").notNull(), // 'summary' | 'analysis' | 'recommendation' | 'alert' | 'pattern'
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Additional structured data (signals, scores, patterns, etc.)
  priority: text("priority").default("medium"), // 'high' | 'medium' | 'low'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlaybookSectionSchema = createInsertSchema(playbookSections).omit({
  id: true,
  createdAt: true,
});

export type InsertPlaybookSection = z.infer<typeof insertPlaybookSectionSchema>;
export type PlaybookSection = typeof playbookSections.$inferSelect;

// Cached market metrics for efficiency
export const cachedMarketMetrics = pgTable("cached_market_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(), // 'quote' | 'technicals' | 'earnings' | 'sentiment' | 'sector'
  ticker: text("ticker"),
  data: jsonb("data").notNull(),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertCachedMarketMetricSchema = createInsertSchema(cachedMarketMetrics).omit({
  id: true,
  cachedAt: true,
});

export type InsertCachedMarketMetric = z.infer<typeof insertCachedMarketMetricSchema>;
export type CachedMarketMetric = typeof cachedMarketMetrics.$inferSelect;
