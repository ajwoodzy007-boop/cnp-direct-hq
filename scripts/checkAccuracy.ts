import { db } from '../server/db';
import { predictions, predictionsHistory } from '../shared/schema';
import { eq, isNull, sql } from 'drizzle-orm';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error('❌ FINNHUB_API_KEY not found in environment variables');
  process.exit(1);
}

interface PredictionResult {
  id: number;
  symbol: string;
  prediction: string;
  target_price: string;
  created_at: Date;
}

async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    console.log(`📊 Fetching current price for ${symbol}...`);

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);

    if (!response.ok) {
      console.error(`❌ Finnhub API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const currentPrice = data.c || data.pc; // Use current price or previous close

    if (!currentPrice || currentPrice === 0) {
      console.error(`❌ No valid price data for ${symbol}`);
      return null;
    }

    console.log(`📊 ${symbol} current price: $${currentPrice}`);
    return currentPrice;
  } catch (error) {
    console.error(`❌ Error fetching price for ${symbol}:`, error);
    return null;
  }
}

function determineOutcome(prediction: string, currentPrice: number, targetPrice: number): 'WIN' | 'LOSS' {
  const predictionText = prediction.toLowerCase();

  // Check if prediction is bullish
  if (predictionText.includes('bullish') || predictionText.includes('up') || predictionText.includes('rise') || predictionText.includes('increase')) {
    // Bullish prediction wins if current price >= target price
    return currentPrice >= targetPrice ? 'WIN' : 'LOSS';
  }

  // Check if prediction is bearish
  if (predictionText.includes('bearish') || predictionText.includes('down') || predictionText.includes('fall') || predictionText.includes('decrease') || predictionText.includes('drop')) {
    // Bearish prediction wins if current price <= target price
    return currentPrice <= targetPrice ? 'WIN' : 'LOSS';
  }

  // Neutral or unclear predictions - check if price moved toward target
  const priceDiff = Math.abs(currentPrice - targetPrice);
  const originalPrice = targetPrice * 0.95; // Assume original price was ~5% below target for bullish, above for bearish
  const originalDiff = Math.abs(originalPrice - targetPrice);

  // If current price is closer to target than original price, consider it a win
  return priceDiff <= originalDiff ? 'WIN' : 'LOSS';
}

async function checkPredictionAccuracy(): Promise<void> {
  console.log('🎯 Starting Prediction Accuracy Check...');

  // Target 4:15 PM ET (21:15 UTC) to ensure market close
  // This logic is robust for cloud servers running on UTC
  const now = new Date();
  const currentUTCHour = now.getUTCHours();
  const currentUTCMinute = now.getUTCMinutes();
  
  // Market close check: 21:00 UTC (4:00 PM ET standard) + 15 min buffer
  const isMarketClosed = currentUTCHour > 21 || (currentUTCHour === 21 && currentUTCMinute >= 15);

  if (!isMarketClosed) {
    console.log('⏰ Market still open (or pre-buffer) - accuracy check will only run after 21:15 UTC (4:15 PM ET)');
    console.log(`📅 Current UTC time: ${currentUTCHour}:${currentUTCMinute < 10 ? '0' + currentUTCMinute : currentUTCMinute}`);
    return;
  }

  console.log('✅ Market closed (UTC check passed) - proceeding with accuracy check');

  try {
    // Get all predictions (we'll filter client-side since outcome column might not exist yet)
    const allPredictions = await db
      .select()
      .from(predictions);

    // Filter to only predictions that don't have an outcome yet
    const ungradedPredictions = allPredictions.filter(p => !p.outcome);

    console.log(`📊 Found ${ungradedPredictions.length} ungraded predictions`);

    if (ungradedPredictions.length === 0) {
      console.log('✅ No predictions to grade');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const prediction of ungradedPredictions) {
      try {
        console.log(`\n🔍 Grading prediction for ${prediction.symbol} (ID: ${prediction.id})`);
        
        // 🛡️ Timeframe Protection: Ensure prediction period has actually elapsed
        const createdDate = new Date(prediction.created_at);
        const predictionDurationMs = prediction.timeframe === '1W' ? 7 * 24 * 60 * 60 * 1000 : 
                                     prediction.timeframe === '1D' ? 24 * 60 * 60 * 1000 : 0;
        
        const maturityDate = new Date(createdDate.getTime() + predictionDurationMs);
        
        // If not enough time has passed, skip grading
        if (now < maturityDate) {
          console.log(`⏳ Prediction not mature yet. Created: ${createdDate.toISOString()}, Matures: ${maturityDate.toISOString()}`);
          continue;
        }

        // Skip if timeframe is not 1W (1 week) - we only grade weekly predictions
        if (prediction.timeframe !== '1W') {
          console.log(`⏭️  Skipping ${prediction.symbol} - not a 1-week prediction`);
          continue;
        }

        // Get current price
        const currentPrice = await getCurrentPrice(prediction.symbol);
        if (!currentPrice) {
          console.log(`❌ Could not get price for ${prediction.symbol}, skipping`);
          errorCount++;
          continue;
        }

        // Parse target price
        const targetPrice = parseFloat(prediction.target_price);
        if (isNaN(targetPrice)) {
          console.log(`❌ Invalid target price for ${prediction.symbol}: ${prediction.target_price}`);
          errorCount++;
          continue;
        }

        // Determine outcome
        const outcome = determineOutcome(prediction.prediction, currentPrice, targetPrice);
        const outcomeDate = new Date();

        console.log(`📈 ${prediction.symbol}: Current=$${currentPrice}, Target=$${targetPrice}, Outcome=${outcome}`);

        // Update the database
        await db
          .update(predictions)
          .set({
            outcome: outcome,
            outcome_price: currentPrice.toString(),
            outcome_date: outcomeDate
          })
          .where(eq(predictions.id, prediction.id));

        console.log(`✅ Updated ${prediction.symbol} prediction: ${outcome}`);
        successCount++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error grading prediction ${prediction.id}:`, error);
        errorCount++;
      }
    }

    // Archive graded predictions to history table
    console.log(`\n📚 Starting archival process...`);

    const gradedPredictions = await db
      .select()
      .from(predictions)
      .where(sql`${predictions.outcome} IS NOT NULL`);

    console.log(`📊 Found ${gradedPredictions.length} graded predictions to archive`);

    let archivedCount = 0;
    for (const pred of gradedPredictions) {
      try {
        // Insert into history table
        await db.insert(predictionsHistory).values({
          symbol: pred.symbol,
          prediction: pred.prediction,
          confidence: pred.confidence,
          target_price: pred.target_price,
          timeframe: pred.timeframe,
          created_at: pred.created_at,
          outcome: pred.outcome,
          outcome_price: pred.outcome_price,
          outcome_date: pred.outcome_date,
          learning_metadata: pred.learning_metadata,
          moved_at: new Date()
        });

        // Delete from active table
        await db.delete(predictions).where(eq(predictions.id, pred.id));

        archivedCount++;
      } catch (error) {
        console.error(`❌ Failed to archive prediction ${pred.id}:`, error);
      }
    }

    console.log(`✅ Successfully archived ${archivedCount} predictions`);

    // Purge old records (older than 24 hours) as additional cleanup
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const purgedResult = await db
      .delete(predictions)
      .where(sql`${predictions.created_at} < ${twentyFourHoursAgo}`);

    console.log(`🧹 Purged ${purgedResult.rowCount || 0} additional old records`);

    console.log(`\n🎉 Accuracy Check Complete!`);
    console.log(`✅ Successfully graded: ${successCount}`);
    console.log(`📚 Successfully archived: ${archivedCount}`);
    console.log(`🧹 Additional purged: ${purgedResult.rowCount || 0}`);
    console.log(`❌ Errors: ${errorCount}`);

  } catch (error) {
    console.error('💥 Critical error in checkPredictionAccuracy:', error);
    process.exit(1);
  }
}

// Run the script
checkPredictionAccuracy()
  .then(() => {
    console.log('🏁 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
