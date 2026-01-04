import { db } from '../server/db.js';
import { predictionsHistory } from '../shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

async function cleanupDuplicatePredictions(): Promise<void> {
  console.log('🧹 Starting Vault Data Cleanup...');

  try {
    // Find duplicate entries (same symbol and created_at date)
    const duplicates = await db
      .select({
        symbol: predictionsHistory.symbol,
        created_at: sql`DATE(${predictionsHistory.created_at})`,
        count: sql<number>`COUNT(*)`
      })
      .from(predictionsHistory)
      .groupBy(predictionsHistory.symbol, sql`DATE(${predictionsHistory.created_at})`)
      .having(sql`COUNT(*) > 1`);

    console.log(`📊 Found ${duplicates.length} duplicate groups to clean up`);

    let totalRemoved = 0;

    for (const dup of duplicates) {
      console.log(`🔄 Processing duplicates for ${dup.symbol} on ${dup.created_at}`);

      // Get all records for this symbol and date
      const records = await db
        .select()
        .from(predictionsHistory)
        .where(and(
          eq(predictionsHistory.symbol, dup.symbol),
          sql`DATE(${predictionsHistory.created_at}) = ${dup.created_at}`
        ))
        .orderBy(predictionsHistory.moved_at);

      // Keep the most recent one (highest moved_at), delete the rest
      const recordsToDelete = records.slice(1); // All except the first (most recent)

      for (const record of recordsToDelete) {
        await db
          .delete(predictionsHistory)
          .where(eq(predictionsHistory.id, record.id));

        console.log(`🗑️  Removed duplicate: ${record.symbol} (ID: ${record.id})`);
        totalRemoved++;
      }
    }

    console.log(`✅ Cleanup complete! Removed ${totalRemoved} duplicate entries`);

    // Now check January 2 data specifically
    const jan2Records = await db
      .select()
      .from(predictionsHistory)
      .where(sql`DATE(${predictionsHistory.created_at}) = '2026-01-02'`);

    console.log(`📅 January 2, 2026 records: ${jan2Records.length}`);

    // Calculate win/loss ratio for Jan 2
    const outcomes = jan2Records.map(r => r.outcome).filter(Boolean);
    const wins = outcomes.filter(o => o === 'WIN').length;
    const losses = outcomes.filter(o => o === 'LOSS').length;
    const winRate = outcomes.length > 0 ? Math.round((wins / outcomes.length) * 100) : 0;

    console.log(`📊 Jan 2 Results: ${wins} wins, ${losses} losses, ${winRate}% win rate`);

    // Show sample of remaining records
    if (jan2Records.length > 0) {
      console.log('📋 Sample records:');
      jan2Records.slice(0, 5).forEach(record => {
        console.log(`  ${record.symbol}: ${record.outcome} (${record.prediction.substring(0, 50)}...)`);
      });
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDuplicatePredictions()
  .then(() => {
    console.log('🏁 Vault cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Vault cleanup failed:', error);
    process.exit(1);
  });
