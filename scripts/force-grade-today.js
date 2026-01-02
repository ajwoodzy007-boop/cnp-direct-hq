import { db } from '../server/db.js';
import { predictions, predictionsHistory } from '../shared/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error('❌ FINNHUB_API_KEY not found in environment variables');
  process.exit(1);
}

async function getCurrentPrice(symbol) {
  try {
    console.log(`📊 Fetching current price for ${symbol}...`);

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);

    if (!response.ok) {
      console.error(`❌ Finnhub API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && data.c) {
      return data.c; // Current price
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching price for ${symbol}:`, error);
    return null;
  }
}

function determineOutcome(prediction, currentPrice, targetPrice) {
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

async function forceGradeToday() {
  console.log('🎯 Force-grading today\'s predictions (Jan 2, 2026)...');

  try {
    // Get today's predictions (created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysPredictions = await db
      .select()
      .from(predictions)
      .where(sql`${predictions.created_at} >= ${today}`);

    console.log(`📊 Found ${todaysPredictions.length} predictions from today`);

    if (todaysPredictions.length === 0) {
      console.log('✅ No predictions to grade - all caught up!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const prediction of todaysPredictions) {
      try {
        console.log(`🔍 Grading prediction for ${prediction.symbol} (ID: ${prediction.id})`);

        const currentPrice = await getCurrentPrice(prediction.symbol);
        if (!currentPrice) {
          console.log(`❌ Could not get price for ${prediction.symbol}, skipping`);
          errorCount++;
          continue;
        }

        const targetPrice = parseFloat(prediction.target_price || '0');
        if (isNaN(targetPrice)) {
          console.log(`❌ Invalid target price for ${prediction.symbol}: ${prediction.target_price}`);
          errorCount++;
          continue;
        }

        const outcome = determineOutcome(prediction.prediction, currentPrice, targetPrice);
        const outcomeDate = new Date();

        console.log(`📈 ${prediction.symbol}: Current=$${currentPrice}, Target=$${targetPrice}, Outcome=${outcome}`);

        // Update the active predictions table with outcome
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

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error grading prediction ${prediction.id}:`, error);
        errorCount++;
      }
    }

    // Now archive all graded predictions
    console.log('\n📦 Archiving graded predictions...');
    const gradedToArchive = await db.select().from(predictions).where(sql`${predictions.outcome} IS NOT NULL`);

    if (gradedToArchive.length > 0) {
      for (const pred of gradedToArchive) {
        await db.insert(predictionsHistory).values({
          id: pred.id, // Preserve original ID
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
          moved_at: new Date() // Timestamp when moved to history
        });
        await db.delete(predictions).where(eq(predictions.id, pred.id));
        console.log(`📋 Archived prediction ID ${pred.id} (${pred.symbol}) to history`);
      }
      console.log(`✅ Archived ${gradedToArchive.length} predictions to history`);
    }

    console.log('\n🎉 Force grading complete!');
    console.log(`✅ Successfully graded: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Today's predictions now available in The Vault!`);

  } catch (error) {
    console.error('💥 Critical error in force grading:', error);
    process.exit(1);
  }
}

forceGradeToday();
