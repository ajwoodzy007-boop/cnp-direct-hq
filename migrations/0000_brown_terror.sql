CREATE TABLE "historical_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"date" date NOT NULL,
	"open_price" numeric(12, 2),
	"high_price" numeric(12, 2),
	"low_price" numeric(12, 2),
	"close_price" numeric(12, 2),
	"volume" bigint,
	"rsi" numeric(5, 2),
	"moving_avg_50" numeric(12, 2),
	CONSTRAINT "historical_prices_ticker_date_unique" UNIQUE("ticker","date")
);
--> statement-breakpoint
CREATE TABLE "playbook_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"section_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"prediction" text NOT NULL,
	"confidence" integer NOT NULL,
	"target_price" numeric(10, 2),
	"timeframe" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"outcome" text,
	"outcome_price" numeric(10, 2),
	"outcome_date" timestamp,
	"learning_metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "simulation_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"simulation_date" timestamp NOT NULL,
	"historical_date" timestamp NOT NULL,
	"price_at_prediction" numeric(10, 2),
	"rsi_at_prediction" numeric(5, 2),
	"rvol_at_prediction" numeric(5, 2),
	"predicted_target" numeric(10, 2),
	"confidence_score" integer,
	"actual_price_7_days" numeric(10, 2),
	"outcome" text,
	"error_percentage" numeric(5, 2),
	"bias_adjustments" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"is_premium" boolean DEFAULT false,
	"tier" text DEFAULT 'FREE',
	"is_admin" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
