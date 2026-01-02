import { db } from '../server/db.js';
import { predictions, predictionsHistory } from '../shared/schema.js';
import { desc } from 'drizzle-orm';

async function checkPredictions() {
  console.log('🔍 Checking predictions tables...');

  try {
    // Check active predictions
    const activePredictions = await db
      .select()
      .from(predictions)
      .orderBy(desc(predictions.created_at))
      .limit(10);

    console.log(`📊 Active predictions: ${activePredictions.length}`);
    activePredictions.forEach(pred => {
      console.log(`  ${pred.id}: ${pred.symbol} - ${pred.prediction.substring(0, 50)}... (${pred.created_at})`);
    });

    // Check historical predictions
    const historicalPredictions = await db
      .select()
      .from(predictionsHistory)
      .orderBy(desc(predictionsHistory.created_at))
      .limit(10);

    console.log(`📊 Historical predictions: ${historicalPredictions.length}`);
    historicalPredictions.forEach(pred => {
      console.log(`  ${pred.id}: ${pred.symbol} - ${pred.prediction.substring(0, 50)}... (${pred.created_at}) - ${pred.outcome}`);
    });

  } catch (error) {
    console.error('❌ Error checking predictions:', error);
  }

  process.exit(0);
}

checkPredictions();
