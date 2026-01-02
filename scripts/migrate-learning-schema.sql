-- Migration script for Sentinel OS Learning Schema
-- Run this in your Neon database console

-- Add learning_metadata column to predictions table
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS learning_metadata JSONB;

-- Create simulation_results table for historical back-testing
CREATE TABLE IF NOT EXISTS simulation_results (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  simulation_date TIMESTAMP NOT NULL DEFAULT NOW(),
  historical_date TIMESTAMP NOT NULL,
  price_at_prediction DECIMAL(10,2),
  rsi_at_prediction DECIMAL(5,2),
  rvol_at_prediction DECIMAL(5,2),
  predicted_target DECIMAL(10,2),
  confidence_score INTEGER,
  actual_price_7_days DECIMAL(10,2),
  outcome TEXT, -- 'WIN' or 'LOSS'
  error_percentage DECIMAL(5,2),
  bias_adjustments JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON predictions(symbol);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_results_symbol ON simulation_results(symbol);
CREATE INDEX IF NOT EXISTS idx_simulation_results_historical_date ON simulation_results(historical_date);

-- Add comments for documentation
COMMENT ON COLUMN predictions.learning_metadata IS 'AI learning insights from historical simulations and past performance';
COMMENT ON TABLE simulation_results IS 'Historical back-testing results for AI training and bias analysis';
