-- Create predictions_history table for archival system
-- Run this in your Neon database console

CREATE TABLE IF NOT EXISTS predictions_history (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  prediction TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  target_price DECIMAL(10, 2),
  timeframe TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  outcome TEXT, -- 'WIN' or 'LOSS'
  outcome_price DECIMAL(10, 2), -- Price when outcome was determined
  outcome_date TIMESTAMP, -- When outcome was determined
  learning_metadata JSONB, -- AI learning insights from historical simulations
  moved_at TIMESTAMP DEFAULT NOW() -- When record was archived
);

-- Verify table creation
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'predictions_history';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'predictions_history'
ORDER BY ordinal_position;
