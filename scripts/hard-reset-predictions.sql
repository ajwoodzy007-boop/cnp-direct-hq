-- Hard reset script for Monday morning clean slate
-- Move all current predictions to history and clear active table

-- First, archive any graded predictions to history (if any exist)
INSERT INTO predictions_history (
  symbol, prediction, confidence, target_price, timeframe,
  created_at, outcome, outcome_price, outcome_date,
  learning_metadata, moved_at
)
SELECT
  symbol, prediction, confidence, target_price, timeframe,
  created_at, outcome, outcome_price, outcome_date,
  learning_metadata, NOW()
FROM predictions
WHERE outcome IS NOT NULL;

-- Clear the active predictions table for a fresh Monday start
DELETE FROM predictions;

-- Optional: Clean up old history records (older than 30 days)
-- Uncomment the following lines if you want to archive old history
-- DELETE FROM predictions_history
-- WHERE created_at < CURRENT_DATE - INTERVAL '30 days';

-- Log the reset operation
DO $$
BEGIN
  RAISE NOTICE 'Predictions table hard reset completed. All active predictions cleared for fresh Monday start.';
END $$;
