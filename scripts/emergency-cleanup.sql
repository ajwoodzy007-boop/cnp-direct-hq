-- Emergency Database Cleanup for Sentinel OS
-- Run this in your Neon database console to remove junk data
-- Execute BEFORE restarting services

-- Step 1: Backup current data (optional but recommended)
-- CREATE TABLE predictions_backup AS SELECT * FROM predictions;

-- Step 2: Remove junk predictions with invalid data
DELETE FROM predictions
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

-- Step 3: Verify cleanup results
SELECT
    COUNT(*) as total_predictions,
    COUNT(CASE WHEN target_price::numeric > 0 THEN 1 END) as valid_targets,
    COUNT(CASE WHEN confidence >= 70 THEN 1 END) as high_confidence,
    AVG(confidence) as avg_confidence,
    MIN(target_price::numeric) as min_target,
    MAX(target_price::numeric) as max_target
FROM predictions;

-- Step 4: Check for any remaining issues
SELECT symbol, target_price, confidence, prediction
FROM predictions
WHERE target_price::numeric <= 0
   OR confidence < 70
   OR LENGTH(prediction) < 10
ORDER BY created_at DESC
LIMIT 10;
