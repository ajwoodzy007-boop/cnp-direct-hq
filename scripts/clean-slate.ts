import { db } from '../server/db.js';
import { predictions } from '../shared/schema.js';

/**
 * Clean Slate Script
 * Empties the active predictions table while preserving predictions_history
 * Run this before Monday morning scan to ensure fresh start
 */

async function cleanSlate(): Promise<void> {
  console.log('🧹 Starting Clean Slate Operation...');

  try {
    // Count current predictions before cleanup
    const beforeCount = await db.$count(predictions);
    console.log(`📊 Found ${beforeCount} active predictions`);

    // Delete all active predictions
    const deleteResult = await db.delete(predictions);
    console.log(`🗑️  Deleted ${deleteResult.rowCount || 0} active predictions`);

    // Verify cleanup
    const afterCount = await db.$count(predictions);
    console.log(`✅ Cleanup complete. Active predictions remaining: ${afterCount}`);

    if (afterCount === 0) {
      console.log('🎉 Clean slate achieved! Ready for Monday morning scan.');
    } else {
      console.warn('⚠️  Some predictions still remain. Manual cleanup may be needed.');
    }

  } catch (error) {
    console.error('💥 Clean slate operation failed:', error);
    process.exit(1);
  }
}

// Run the script
cleanSlate()
  .then(() => {
    console.log('🏁 Clean slate operation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Clean slate operation failed:', error);
    process.exit(1);
  });
