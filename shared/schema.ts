import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  tier: text("tier").notNull().default("FREE"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password_hash: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  signalType: text("signal_type").notNull(),
  entryPrice: real("entry_price").notNull(),
  openPrice: real("open_price"),
  openPriceLockedAt: timestamp("open_price_locked_at"),
  openPriceSource: text("open_price_source"),
  prevClose: real("prev_close"),
  predictedPrice: real("predicted_price"),
  predictionDate: timestamp("prediction_date").notNull().defaultNow(),
  outcome: text("outcome"),
  outcomePrice: real("outcome_price"),
  outcomeDate: timestamp("outcome_date"),
  assetType: text("asset_type").notNull().default("stock"),
  rsi: real("rsi"),
  rvol: real("rvol"),
  sector: text("sector"),
  confidence: text("confidence"),
  reasoning: text("reasoning"),
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
  openPrice: real("open_price"), // Market open price at 9:30 AM ET
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

// User profiles with personal info and subscription status
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  // Personal Information
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  // Onboarding & Marketing
  marketingSource: text("marketing_source"), // 'google' | 'twitter' | 'youtube' | 'friend' | 'reddit' | 'other'
  // Stripe & Subscription
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionId: text("subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"), // 'free' | 'active' | 'cancelled' | 'past_due'
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  // Trading Preferences
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

// ============================================
// AI SIGNAL INSIGHTS AND LEARNING TABLES
// ============================================

// AI signal insights - stores AI analysis of market signals
export const aiSignalInsights = pgTable("ai_signal_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  surface: text("surface").notNull(), // 'market_sentinel' | 'top_gainers' | 'top_losers' | 'buy_opportunities' | 'sell_warnings' | 'top10_predictions'
  signalType: text("signal_type"), // 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL'
  confidence: real("confidence").notNull(), // 0-100
  aiReasoning: text("ai_reasoning").notNull(),
  technicalFactors: jsonb("technical_factors"), // RSI, momentum, volume data
  sentimentFactors: jsonb("sentiment_factors"), // news sentiment, social sentiment
  priceTargets: jsonb("price_targets"), // entry, stop loss, targets
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiSignalInsightSchema = createInsertSchema(aiSignalInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertAiSignalInsight = z.infer<typeof insertAiSignalInsightSchema>;
export type AiSignalInsight = typeof aiSignalInsights.$inferSelect;

// AI prediction scores - tracks AI-generated prediction confidence with outcomes
export const aiPredictionScores = pgTable("ai_prediction_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  predictionType: text("prediction_type").notNull(), // 'daily' | 'swing' | 'momentum'
  aiConfidence: real("ai_confidence").notNull(), // 0-100
  predictedDirection: text("predicted_direction").notNull(), // 'bullish' | 'bearish' | 'neutral'
  predictedChange: real("predicted_change"), // Expected % change
  entryPrice: real("entry_price").notNull(),
  targetPrice: real("target_price"),
  stopLoss: real("stop_loss"),
  aiReasoning: text("ai_reasoning").notNull(),
  factorsUsed: jsonb("factors_used"), // technical, sentiment, historical patterns
  actualOutcome: text("actual_outcome"), // 'win' | 'loss' | 'pending'
  actualChange: real("actual_change"),
  outcomePrice: real("outcome_price"),
  predictionDate: timestamp("prediction_date").notNull().defaultNow(),
  outcomeDate: timestamp("outcome_date"),
});

export const insertAiPredictionScoreSchema = createInsertSchema(aiPredictionScores).omit({
  id: true,
  predictionDate: true,
  actualOutcome: true,
  actualChange: true,
  outcomePrice: true,
  outcomeDate: true,
});

export type InsertAiPredictionScore = z.infer<typeof insertAiPredictionScoreSchema>;
export type AiPredictionScore = typeof aiPredictionScores.$inferSelect;

// AI model performance tracking - for learning from historical outcomes
export const aiModelMetrics = pgTable("ai_model_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricDate: text("metric_date").notNull(), // YYYY-MM-DD
  surface: text("surface").notNull(), // which feature this metric is for
  totalPredictions: real("total_predictions").notNull().default(0),
  correctPredictions: real("correct_predictions").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  avgConfidence: real("avg_confidence").notNull().default(0),
  avgActualReturn: real("avg_actual_return").default(0),
  factorWeights: jsonb("factor_weights"), // learned importance of each factor
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiModelMetricSchema = createInsertSchema(aiModelMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertAiModelMetric = z.infer<typeof insertAiModelMetricSchema>;
export type AiModelMetric = typeof aiModelMetrics.$inferSelect;

// Beta passes for 7-day trial access
export const betaPasses = pgTable("beta_passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  redeemedBy: varchar("redeemed_by").references(() => users.id),
  redeemedAt: timestamp("redeemed_at"),
  createdByAdmin: text("created_by_admin"),
});

export const insertBetaPassSchema = createInsertSchema(betaPasses).omit({
  id: true,
  createdAt: true,
  redeemedBy: true,
  redeemedAt: true,
});

export type InsertBetaPass = z.infer<typeof insertBetaPassSchema>;
export type BetaPass = typeof betaPasses.$inferSelect;

// ============================================
// ADMIN HQ INTEL TRACKING TABLES
// ============================================

// Login events for DAU tracking
export const loginEvents = pgTable("login_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const insertLoginEventSchema = createInsertSchema(loginEvents).omit({
  id: true,
  occurredAt: true,
});

export type InsertLoginEvent = z.infer<typeof insertLoginEventSchema>;
export type LoginEvent = typeof loginEvents.$inferSelect;

// Signal engagement tracking
export const signalEngagementEvents = pgTable("signal_engagement_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  actionType: text("action_type").notNull(), // 'system_heat_modal' | 'signal_accuracy_modal' | 'prediction_click'
  ticker: text("ticker"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
});

export const insertSignalEngagementSchema = createInsertSchema(signalEngagementEvents).omit({
  id: true,
  occurredAt: true,
});

export type InsertSignalEngagement = z.infer<typeof insertSignalEngagementSchema>;
export type SignalEngagementEvent = typeof signalEngagementEvents.$inferSelect;

// ============================================
// USER TESTIMONIALS TABLE
// ============================================

export const userTestimonials = pgTable("user_testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  ticker: text("ticker").notNull(),
  feedback: text("feedback").notNull(),
  helpful: boolean("helpful").notNull().default(true),
  predictionDate: text("prediction_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approved: boolean("approved").default(false),
});

export const insertUserTestimonialSchema = createInsertSchema(userTestimonials).omit({
  id: true,
  createdAt: true,
  approved: true,
});

export type InsertUserTestimonial = z.infer<typeof insertUserTestimonialSchema>;
export type UserTestimonial = typeof userTestimonials.$inferSelect;

// ============================================
// BACKTEST CACHE TABLE
// ============================================

// Cached backtest results for fast loading
export const backtestCache = pgTable("backtest_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheType: text("cache_type").notNull(), // '30day' or '6month'
  data: jsonb("data").notNull(), // Full backtest result with days array
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const insertBacktestCacheSchema = createInsertSchema(backtestCache).omit({
  id: true,
  computedAt: true,
});

export type InsertBacktestCache = z.infer<typeof insertBacktestCacheSchema>;
export type BacktestCache = typeof backtestCache.$inferSelect;
