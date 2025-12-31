-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "affiliate_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"destination" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"clicked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_model_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_date" text NOT NULL,
	"surface" text NOT NULL,
	"total_predictions" real DEFAULT 0 NOT NULL,
	"correct_predictions" real DEFAULT 0 NOT NULL,
	"win_rate" real DEFAULT 0 NOT NULL,
	"avg_confidence" real DEFAULT 0 NOT NULL,
	"avg_actual_return" real DEFAULT 0,
	"factor_weights" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_prediction_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_date" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp,
	"market_open" text DEFAULT 'true',
	"status" varchar(20) DEFAULT 'completed',
	CONSTRAINT "daily_prediction_runs_run_date_unique" UNIQUE("run_date")
);
--> statement-breakpoint
CREATE TABLE "ai_prediction_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"prediction_type" text NOT NULL,
	"ai_confidence" real NOT NULL,
	"predicted_direction" text NOT NULL,
	"predicted_change" real,
	"entry_price" real NOT NULL,
	"target_price" real,
	"stop_loss" real,
	"ai_reasoning" text NOT NULL,
	"factors_used" jsonb,
	"actual_outcome" text,
	"actual_change" real,
	"outcome_price" real,
	"prediction_date" timestamp DEFAULT now() NOT NULL,
	"outcome_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_signal_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"surface" text NOT NULL,
	"signal_type" text,
	"confidence" real NOT NULL,
	"ai_reasoning" text NOT NULL,
	"technical_factors" jsonb,
	"sentiment_factors" jsonb,
	"price_targets" jsonb,
	"valid_until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtest_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_market_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" text NOT NULL,
	"ticker" text,
	"data" jsonb NOT NULL,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"occurred_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "ai_playbook_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"playbook_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input_data" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"membership_tier" text DEFAULT 'FREE',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "members_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "beta_passes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"redeemed_by" varchar,
	"redeemed_at" timestamp,
	"created_by_admin" text,
	CONSTRAINT "beta_passes_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" text PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"type" text NOT NULL,
	"entryPrice" real NOT NULL,
	"shares" real NOT NULL,
	"dateOpened" text NOT NULL,
	"status" text DEFAULT 'OPEN',
	"strikePrice" real,
	"expirationDate" text,
	"contractSymbol" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"signal_type" text NOT NULL,
	"entry_price" real NOT NULL,
	"prediction_date" timestamp DEFAULT now() NOT NULL,
	"outcome" text,
	"outcome_price" real,
	"outcome_date" timestamp,
	"asset_type" text DEFAULT 'stock' NOT NULL,
	"open_price" real,
	"predicted_price" real,
	"rsi" real,
	"rvol" real,
	"sector" text,
	"confidence" text,
	"reasoning" text,
	"open_price_locked_at" timestamp,
	"open_price_source" text,
	"prev_close" real
);
--> statement-breakpoint
CREATE TABLE "user_portfolio" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"ticker" text NOT NULL,
	"shares" real NOT NULL,
	"average_cost" real NOT NULL,
	"current_price" real,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"section_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"priority" text DEFAULT 'medium',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_engagement_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action_type" text NOT NULL,
	"ticker" text,
	"occurred_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"stripe_customer_id" text,
	"subscription_id" text,
	"subscription_status" text DEFAULT 'free',
	"subscription_period_end" timestamp,
	"trading_style" text DEFAULT 'swing',
	"risk_tolerance" text DEFAULT 'moderate',
	"experience_level" text DEFAULT 'intermediate',
	"preferred_sectors" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"marketing_source" text
);
--> statement-breakpoint
CREATE TABLE "user_testimonials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"ticker" text NOT NULL,
	"feedback" text NOT NULL,
	"helpful" boolean DEFAULT true,
	"prediction_date" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"approved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"tier" text DEFAULT 'FREE' NOT NULL,
	"is_premium" boolean DEFAULT true,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "weekly_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"week_start" timestamp NOT NULL,
	"signal_type" text NOT NULL,
	"entry_price" real NOT NULL,
	"current_price" real,
	"gain_percent" real,
	"reasoning" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_prediction_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"ticker" text NOT NULL,
	"confidence_score" real NOT NULL,
	"reasoning" text,
	"entry_price" real NOT NULL,
	"close_price" real,
	"current_price" real,
	"close_pnl" real,
	"total_pnl" real,
	"outcome" text,
	"predicted_price" real,
	"open_price" real,
	"signal_type" varchar(20) DEFAULT 'BUY'
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_passes" ADD CONSTRAINT "beta_passes_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_engagement_events" ADD CONSTRAINT "signal_engagement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_testimonials" ADD CONSTRAINT "user_testimonials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_prediction_entries" ADD CONSTRAINT "daily_prediction_entries_run_id_daily_prediction_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."daily_prediction_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire" timestamp_ops);
*/