-- SQL Command to add missing columns from predictions table into daily_prediction_entries
-- Run this in your Neon database to prepare for eventual table merge
-- 
-- This single command adds all columns that exist in predictions but are missing in daily_prediction_entries

ALTER TABLE daily_prediction_entries 
  ADD COLUMN IF NOT EXISTS prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS outcome_price REAL,
  ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'stock',
  ADD COLUMN IF NOT EXISTS rsi REAL,
  ADD COLUMN IF NOT EXISTS rvol REAL,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS confidence TEXT,
  ADD COLUMN IF NOT EXISTS open_price_locked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS open_price_source TEXT,
  ADD COLUMN IF NOT EXISTS prev_close REAL,
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Note: daily_prediction_entries already has:
-- - id, ticker, entryPrice, openPrice, predictedPrice, signalType, outcome, reasoning
-- - closePrice, currentPrice, closePnl, totalPnl, confidenceScore, runId
--
-- This migration adds the missing columns from predictions table (including title) 
-- so both tables have compatible schemas for future merge operations.

