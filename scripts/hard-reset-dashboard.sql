-- HARD RESET: Move all existing predictions to history table
-- Run this in your Neon database console to clean the dashboard
-- This will move all current predictions to predictions_history and leave the active table empty

-- Step 1: Move all existing predictions to history table
INSERT INTO predictions_history (
  symbol,
  prediction,
  confidence,
  target_price,
  timeframe,
  created_at,
  outcome,
  outcome_price,
  outcome_date,
  learning_metadata,
  moved_at
)
SELECT
  symbol,
  prediction,
  confidence,
  target_price,
  timeframe,
  created_at,
  outcome,
  outcome_price,
  outcome_date,
  learning_metadata,
  NOW() as moved_at
FROM predictions;

-- Step 2: Count records moved
SELECT
  (SELECT COUNT(*) FROM predictions_history WHERE moved_at >= NOW() - INTERVAL '1 minute') as records_moved,
  (SELECT COUNT(*) FROM predictions) as remaining_active;

-- Step 3: Clear the active predictions table
DELETE FROM predictions;

-- Step 4: Verify clean state
SELECT
  (SELECT COUNT(*) FROM predictions) as active_predictions,
  (SELECT COUNT(*) FROM predictions_history) as historical_predictions,
  (SELECT COUNT(*) FROM predictions_history WHERE moved_at >= NOW() - INTERVAL '1 minute') as recently_moved;

-- Optional: Clean up any invalid data in history table
DELETE FROM predictions_history
WHERE target_price::numeric <= 0
   OR target_price IS NULL
   OR target_price = ''
   OR target_price = '0'
   OR confidence < 70
   OR confidence IS NULL
   OR symbol IS NULL
   OR symbol = ''
   OR prediction IS NULL
   OR prediction = ''
   OR LENGTH(prediction) < 10;

-- Final verification
SELECT
  'Dashboard Reset Complete' as status,
  (SELECT COUNT(*) FROM predictions) as active_count,
  (SELECT COUNT(*) FROM predictions_history) as history_count;
