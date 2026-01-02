-- Add outcome tracking columns to predictions table
-- Run this in your Neon SQL Editor

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS outcome_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMP;

-- Optional: Add comments for clarity
COMMENT ON COLUMN predictions.outcome IS 'WIN or LOSS outcome of the prediction';
COMMENT ON COLUMN predictions.outcome_price IS 'Stock price when outcome was determined';
COMMENT ON COLUMN predictions.outcome_date IS 'Timestamp when outcome was determined';
