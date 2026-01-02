-- Add learning_metadata column to existing predictions table
-- Run this in your Neon database console

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS learning_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN predictions.learning_metadata IS 'AI learning insights from historical simulations and past performance';
