import { db } from '../server/db.js';
import { predictions } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function cleanup() {
  try {
    console.log('🧹 Starting emergency database cleanup...');

    // Count before cleanup
    const beforeCount = await db.select({ count: sql`count(*)` }).from(predictions);
    console.log('📊 Records before cleanup:', beforeCount[0].count);

    // Remove junk data
    await db.delete(predictions).where(sql`
      target_price::numeric <= 0 OR
      target_price IS NULL OR
      target_price = '' OR
      target_price = '0' OR
      confidence < 70 OR
      confidence IS NULL OR
      symbol IS NULL OR
      symbol = '' OR
      prediction IS NULL OR
      prediction = '' OR
      LENGTH(prediction) < 10
    `);

    // Count after cleanup
    const afterCount = await db.select({ count: sql`count(*)` }).from(predictions);
    console.log('📊 Records after cleanup:', afterCount[0].count);
    console.log('🧹 Cleaned up', beforeCount[0].count - afterCount[0].count, 'junk records');

    // Verify remaining data quality
    const qualityCheck = await db.select({
      total: sql`count(*)`,
      validTargets: sql`count(case when target_price::numeric > 0 then 1 end)`,
      highConfidence: sql`count(case when confidence >= 70 then 1 end)`,
      avgConfidence: sql`avg(confidence)`,
      minTarget: sql`min(target_price::numeric)`,
      maxTarget: sql`max(target_price::numeric)`
    }).from(predictions);

    console.log('✅ Data quality verification:', qualityCheck[0]);

    // Show sample of remaining data
    const sampleData = await db.select({
      symbol: predictions.symbol,
      target_price: predictions.target_price,
      confidence: predictions.confidence,
      prediction: sql`left(prediction, 50)`
    }).from(predictions).limit(5);

    console.log('📋 Sample remaining data:');
    sampleData.forEach(row => {
      console.log(`  ${row.symbol}: $${row.target_price} (${row.confidence}% confidence)`);
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }

  console.log('✅ Emergency cleanup completed successfully!');
  process.exit(0);
}

cleanup();
