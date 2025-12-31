import { pgTable, varchar, text, timestamp, real, jsonb, unique, foreignKey, serial, boolean, index, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const affiliateClicks = pgTable("affiliate_clicks", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticker: text().notNull(),
	destination: text().notNull(),
	referrer: text(),
	userAgent: text("user_agent"),
	clickedAt: timestamp("clicked_at", { mode: 'string' }).defaultNow().notNull(),
});

export const aiModelMetrics = pgTable("ai_model_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	metricDate: text("metric_date").notNull(),
	surface: text().notNull(),
	totalPredictions: real("total_predictions").default(0).notNull(),
	correctPredictions: real("correct_predictions").default(0).notNull(),
	winRate: real("win_rate").default(0).notNull(),
	avgConfidence: real("avg_confidence").default(0).notNull(),
	avgActualReturn: real("avg_actual_return").default(0),
	factorWeights: jsonb("factor_weights"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const dailyPredictionRuns = pgTable("daily_prediction_runs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	runDate: text("run_date").notNull(),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow().notNull(),
	finalizedAt: timestamp("finalized_at", { mode: 'string' }),
	marketOpen: text("market_open").default('true'),
	status: varchar({ length: 20 }).default('completed'),
}, (table) => [
	unique("daily_prediction_runs_run_date_unique").on(table.runDate),
]);

export const aiPredictionScores = pgTable("ai_prediction_scores", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticker: text().notNull(),
	predictionType: text("prediction_type").notNull(),
	aiConfidence: real("ai_confidence").notNull(),
	predictedDirection: text("predicted_direction").notNull(),
	predictedChange: real("predicted_change"),
	entryPrice: real("entry_price").notNull(),
	targetPrice: real("target_price"),
	stopLoss: real("stop_loss"),
	aiReasoning: text("ai_reasoning").notNull(),
	factorsUsed: jsonb("factors_used"),
	actualOutcome: text("actual_outcome"),
	actualChange: real("actual_change"),
	outcomePrice: real("outcome_price"),
	predictionDate: timestamp("prediction_date", { mode: 'string' }).defaultNow().notNull(),
	outcomeDate: timestamp("outcome_date", { mode: 'string' }),
});

export const aiSignalInsights = pgTable("ai_signal_insights", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticker: text().notNull(),
	surface: text().notNull(),
	signalType: text("signal_type"),
	confidence: real().notNull(),
	aiReasoning: text("ai_reasoning").notNull(),
	technicalFactors: jsonb("technical_factors"),
	sentimentFactors: jsonb("sentiment_factors"),
	priceTargets: jsonb("price_targets"),
	validUntil: timestamp("valid_until", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const backtestCache = pgTable("backtest_cache", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	cacheType: text("cache_type").notNull(),
	data: jsonb().notNull(),
	computedAt: timestamp("computed_at", { mode: 'string' }).defaultNow().notNull(),
});

export const cachedMarketMetrics = pgTable("cached_market_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	metricType: text("metric_type").notNull(),
	ticker: text(),
	data: jsonb().notNull(),
	cachedAt: timestamp("cached_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
});

export const loginEvents = pgTable("login_events", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "login_events_user_id_fkey"
		}),
]);

export const aiPlaybookRuns = pgTable("ai_playbook_runs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	playbookType: text("playbook_type").notNull(),
	status: text().default('pending').notNull(),
	inputData: jsonb("input_data"),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
});

export const members = pgTable("members", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	membershipTier: text("membership_tier").default('FREE'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("members_email_key").on(table.email),
]);

export const betaPasses = pgTable("beta_passes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	redeemedBy: varchar("redeemed_by"),
	redeemedAt: timestamp("redeemed_at", { mode: 'string' }),
	createdByAdmin: text("created_by_admin"),
}, (table) => [
	foreignKey({
			columns: [table.redeemedBy],
			foreignColumns: [users.id],
			name: "beta_passes_redeemed_by_fkey"
		}),
	unique("beta_passes_code_key").on(table.code),
]);

export const portfolio = pgTable("portfolio", {
	id: text().primaryKey().notNull(),
	ticker: text().notNull(),
	type: text().notNull(),
	entryPrice: real().notNull(),
	shares: real().notNull(),
	dateOpened: text().notNull(),
	status: text().default('OPEN'),
	strikePrice: real(),
	expirationDate: text(),
	contractSymbol: text(),
	userId: text("user_id"),
});

export const predictions = pgTable("predictions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticker: text().notNull(),
	signalType: text("signal_type").notNull(),
	entryPrice: real("entry_price").notNull(),
	predictionDate: timestamp("prediction_date", { mode: 'string' }).defaultNow().notNull(),
	outcome: text(),
	outcomePrice: real("outcome_price"),
	outcomeDate: timestamp("outcome_date", { mode: 'string' }),
	assetType: text("asset_type").default('stock').notNull(),
	openPrice: real("open_price"),
	predictedPrice: real("predicted_price"),
	rsi: real(),
	rvol: real(),
	sector: text(),
	confidence: text(),
	reasoning: text(),
	openPriceLockedAt: timestamp("open_price_locked_at", { mode: 'string' }),
	openPriceSource: text("open_price_source"),
	prevClose: real("prev_close"),
});

export const userPortfolio = pgTable("user_portfolio", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	ticker: text().notNull(),
	shares: real().notNull(),
	averageCost: real("average_cost").notNull(),
	currentPrice: real("current_price"),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const playbookSections = pgTable("playbook_sections", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	runId: varchar("run_id").notNull(),
	sectionType: text("section_type").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	metadata: jsonb(),
	priority: text().default('medium'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const signalEngagementEvents = pgTable("signal_engagement_events", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	actionType: text("action_type").notNull(),
	ticker: text(),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "signal_engagement_events_user_id_fkey"
		}),
]);

export const userProfiles = pgTable("user_profiles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	stripeCustomerId: text("stripe_customer_id"),
	subscriptionId: text("subscription_id"),
	subscriptionStatus: text("subscription_status").default('free'),
	subscriptionPeriodEnd: timestamp("subscription_period_end", { mode: 'string' }),
	tradingStyle: text("trading_style").default('swing'),
	riskTolerance: text("risk_tolerance").default('moderate'),
	experienceLevel: text("experience_level").default('intermediate'),
	preferredSectors: text("preferred_sectors").array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	marketingSource: text("marketing_source"),
});

export const userTestimonials = pgTable("user_testimonials", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	ticker: text().notNull(),
	feedback: text().notNull(),
	helpful: boolean().default(true),
	predictionDate: text("prediction_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	approved: boolean().default(false),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_testimonials_user_id_fkey"
		}),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	tier: text().default('FREE').notNull(),
	isPremium: boolean("is_premium").default(true),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const watchlist = pgTable("watchlist", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticker: text().notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("watchlist_ticker_unique").on(table.ticker),
]);

export const weeklyRecommendations = pgTable("weekly_recommendations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticker: text().notNull(),
	weekStart: timestamp("week_start", { mode: 'string' }).notNull(),
	signalType: text("signal_type").notNull(),
	entryPrice: real("entry_price").notNull(),
	currentPrice: real("current_price"),
	gainPercent: real("gain_percent"),
	reasoning: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const dailyPredictionEntries = pgTable("daily_prediction_entries", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	runId: varchar("run_id").notNull(),
	ticker: text().notNull(),
	confidenceScore: real("confidence_score").notNull(),
	reasoning: text(),
	entryPrice: real("entry_price").notNull(),
	closePrice: real("close_price"),
	currentPrice: real("current_price"),
	closePnl: real("close_pnl"),
	totalPnl: real("total_pnl"),
	outcome: text(),
	predictedPrice: real("predicted_price"),
	openPrice: real("open_price"),
	signalType: varchar("signal_type", { length: 20 }).default('BUY'),
}, (table) => [
	foreignKey({
			columns: [table.runId],
			foreignColumns: [dailyPredictionRuns.id],
			name: "daily_prediction_entries_run_id_daily_prediction_runs_id_fk"
		}),
]);

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);
