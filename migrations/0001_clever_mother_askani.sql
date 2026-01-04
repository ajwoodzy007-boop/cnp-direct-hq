CREATE TABLE "predictions_history" (
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
	"learning_metadata" jsonb,
	"moved_at" timestamp DEFAULT now()
);
