import { db } from '../server/db';
import { predictions } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';

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

    console.log(`\n🎉 Accuracy Check Complete!`);
    console.log(`✅ Successfully graded: ${successCount}`);
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
