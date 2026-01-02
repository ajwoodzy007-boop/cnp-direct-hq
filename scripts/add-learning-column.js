import { db } from '../server/db.js';

// Simple script to add learning_metadata column to predictions table
async function addLearningColumn() {
  try {
    console.log('🔧 Adding learning_metadata column to predictions table...');

    // Use raw SQL to add the column
    await db.execute(`
      ALTER TABLE predictions
      ADD COLUMN IF NOT EXISTS learning_metadata JSONB
    `);

    // Add comment for documentation
    await db.execute(`
      COMMENT ON COLUMN predictions.learning_metadata IS 'AI learning insights from historical simulations and past performance'
    `);

    console.log('✅ Successfully added learning_metadata column!');

    // Verify the column was added
    const result = await db.execute(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'predictions'
      AND column_name = 'learning_metadata'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Column verification successful:', result.rows[0]);
    } else {
      console.log('⚠️ Column verification failed - column may not have been added');
    }

  } catch (error) {
    console.error('❌ Error adding learning_metadata column:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addLearningColumn();
