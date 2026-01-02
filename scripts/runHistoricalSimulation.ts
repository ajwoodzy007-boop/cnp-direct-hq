import OpenAI from 'openai';
import { db } from '../server/db';
import { predictions, simulationResults } from '../shared/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

// OpenAI configuration (reuse from existing aiPlaybook)
const getOpenAIKey = () => {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (integrationKey && !integrationKey.includes("DUMMY")) return integrationKey;
  return process.env.OPENAI_API_KEY || "";
};

const openai = new OpenAI({
  apiKey: getOpenAIKey(),
});

// Top tickers to simulate
const TOP_TICKERS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA'];

interface HistoricalDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SimulationResult {
  symbol: string;
  historicalDate: Date;
  priceAtPrediction: number;
  rsiAtPrediction: number;
  rvolAtPrediction: number;
  predictedTarget: number;
  confidenceScore: number;
  actualPrice7Days: number;
  outcome: 'WIN' | 'LOSS';
  errorPercentage: number;
  biasAdjustments?: any;
}

async function fetchHistoricalData(symbol: string, days: number = 60): Promise<HistoricalDataPoint[]> {
  try {
    console.log(`📊 Fetching ${days} days of historical data for ${symbol}...`);

    const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_KEY) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    // Calculate date range (last 60 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Fetch historical data from Finnhub
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${startTimestamp}&to=${endTimestamp}&token=${FINNHUB_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.c || !data.o || !data.h || !data.l || !data.v || !data.t) {
      throw new Error('Invalid data format from Finnhub');
    }

    // Convert to our format
    const historicalData: HistoricalDataPoint[] = [];
    for (let i = 0; i < data.t.length; i++) {
      historicalData.push({
        date: new Date(data.t[i] * 1000),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      });
    }

    console.log(`✅ Fetched ${historicalData.length} days of data for ${symbol}`);
    return historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());

  } catch (error) {
    console.error(`❌ Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

function calculateRSIFromPrices(closes: number[]): number {
  if (closes.length < 15) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;

  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgGain / avgLoss;

  return 100 - (100 / (1 + rs));
}

function calculateRVolForDay(historicalData: HistoricalDataPoint[], targetDate: Date): number {
  // Find the target date and get previous 20 days for volume calculation
  const targetIndex = historicalData.findIndex(d => d.date.toDateString() === targetDate.toDateString());
  if (targetIndex === -1 || targetIndex < 20) return 1.0;

  const recentVolumes = historicalData.slice(targetIndex - 20, targetIndex).map(d => d.volume);
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const currentVolume = historicalData[targetIndex].volume;

  return avgVolume > 0 ? currentVolume / avgVolume : 1.0;
}

async function generateHistoricalPrediction(symbol: string, historicalData: HistoricalDataPoint[], targetDate: Date): Promise<SimulationResult | null> {
  try {
    // Find the data point for the target date
    const targetDataPoint = historicalData.find(d => d.date.toDateString() === targetDate.toDateString());
    if (!targetDataPoint) {
      console.log(`⚠️ No data found for ${symbol} on ${targetDate.toDateString()}`);
      return null;
    }

    // Get previous 15 days for RSI calculation
    const targetIndex = historicalData.findIndex(d => d.date.toDateString() === targetDate.toDateString());
    if (targetIndex < 15) {
      console.log(`⚠️ Not enough historical data for RSI calculation on ${targetDate.toDateString()}`);
      return null;
    }

    const rsiPrices = historicalData.slice(targetIndex - 14, targetIndex + 1).map(d => d.close);
    const rsi = calculateRSIFromPrices(rsiPrices);
    const rvol = calculateRVolForDay(historicalData, targetDate);

    console.log(`📊 ${symbol} ${targetDate.toDateString()}: Price=$${targetDataPoint.close}, RSI=${rsi.toFixed(1)}, RVol=${rvol.toFixed(2)}`);

    // Generate AI prediction using the same logic as populateOracle.ts
    const learningData = await getHistoricalLearning(symbol);
    console.log(`🧠 Historical learning: ${learningData}`);

    const prompt = `You are the Lead Quantitative Strategist for Sentinel OS performing a historical simulation.

Historical Context: ${learningData}

Current Technicals (from ${targetDate.toISOString().split('T')[0]}): Price $${targetDataPoint.close}, RSI ${rsi.toFixed(1)}, RVol ${rvol.toFixed(2)}

Generate a 1-week prediction for ${symbol} as if this were happening today. Consider both technical indicators and historical performance patterns.

Output pure JSON:
{
  "prediction": "Brief analysis incorporating technicals and historical lessons",
  "target_price": "0.00",
  "confidence": 0-100,
  "learning_note": "Internal note on how historical patterns influenced this prediction"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are performing a historical market simulation. Analyze the provided data and historical context to make an informed prediction." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    const parsed = JSON.parse(content);

    // Find the price 7 days later
    const futureDate = new Date(targetDate);
    futureDate.setDate(futureDate.getDate() + 7);

    const futureDataPoint = historicalData.find(d => d.date.toDateString() === futureDate.toDateString());
    const actualPrice7Days = futureDataPoint ? futureDataPoint.close : targetDataPoint.close;

    // Determine outcome
    const predictedTarget = parseFloat(parsed.target_price);
    const outcome = actualPrice7Days >= predictedTarget ? 'WIN' : 'LOSS';
    const errorPercentage = Math.abs((predictedTarget - actualPrice7Days) / actualPrice7Days) * 100;

    console.log(`🎯 Prediction: ${parsed.prediction.substring(0, 80)}...`);
    console.log(`📈 Target: $${predictedTarget}, Actual (7 days): $${actualPrice7Days}, Outcome: ${outcome}, Error: ${errorPercentage.toFixed(1)}%`);

    return {
      symbol,
      historicalDate: targetDate,
      priceAtPrediction: targetDataPoint.close,
      rsiAtPrediction: rsi,
      rvolAtPrediction: rvol,
      predictedTarget,
      confidenceScore: parseInt(parsed.confidence) || 50,
      actualPrice7Days,
      outcome,
      errorPercentage,
      biasAdjustments: { learningNote: parsed.learning_note }
    };

  } catch (error) {
    console.error(`❌ Error generating prediction for ${symbol} on ${targetDate.toDateString()}:`, error);
    return null;
  }
}

async function getHistoricalLearning(ticker: string): Promise<string> {
  try {
    // Get last 10 predictions for this ticker
    const historicalPredictions = await db
      .select()
      .from(predictions)
      .where(eq(predictions.symbol, ticker))
      .orderBy(desc(predictions.created_at))
      .limit(10);

    if (historicalPredictions.length === 0) {
      return `No historical predictions found for ${ticker}.`;
    }

    const outcomes = historicalPredictions.map(p => p.outcome).filter(Boolean);
    const wins = outcomes.filter(o => o === 'WIN').length;
    const winRate = outcomes.length > 0 ? Math.round((wins / outcomes.length) * 100) : 0;

    const outcomeSequence = historicalPredictions
      .slice(0, 5)
      .map(p => p.outcome || 'PENDING')
      .join(', ');

    return `Last ${historicalPredictions.length} ${ticker} predictions: ${outcomeSequence}. Win rate: ${winRate}%.`;

  } catch (error) {
    console.error(`❌ Error fetching historical learning for ${ticker}:`, error);
    return `Unable to fetch historical data for ${ticker}.`;
  }
}

async function saveSimulationResult(result: SimulationResult): Promise<void> {
  try {
    await db.insert(simulationResults).values({
      symbol: result.symbol,
      simulation_date: new Date(),
      historical_date: result.historicalDate,
      price_at_prediction: result.priceAtPrediction.toString(),
      rsi_at_prediction: result.rsiAtPrediction.toString(),
      rvol_at_prediction: result.rvolAtPrediction.toString(),
      predicted_target: result.predictedTarget.toString(),
      confidence_score: result.confidenceScore,
      actual_price_7_days: result.actualPrice7Days.toString(),
      outcome: result.outcome,
      error_percentage: result.errorPercentage.toString(),
      bias_adjustments: result.biasAdjustments
    });

    console.log(`💾 Saved simulation result for ${result.symbol} on ${result.historicalDate.toDateString()}`);
  } catch (error) {
    console.error(`❌ Error saving simulation result:`, error);
  }
}

async function analyzeBiasAdjustments(): Promise<void> {
  try {
    console.log('\n🔍 Analyzing simulation results for bias adjustments...');

    // Get all simulation results
    const allResults = await db.select().from(simulationResults);

    if (allResults.length === 0) {
      console.log('⚠️ No simulation results found for analysis');
      return;
    }

    // Group by symbol
    const resultsBySymbol: { [key: string]: typeof allResults } = {};
    allResults.forEach(result => {
      if (!resultsBySymbol[result.symbol]) {
        resultsBySymbol[result.symbol] = [];
      }
      resultsBySymbol[result.symbol].push(result);
    });

    // Analyze each symbol
    for (const [symbol, results] of Object.entries(resultsBySymbol)) {
      const wins = results.filter(r => r.outcome === 'WIN').length;
      const total = results.length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      const avgError = results.reduce((sum, r) => sum + parseFloat(r.error_percentage), 0) / results.length;

      // Identify failure patterns
      const failures = results.filter(r => r.outcome === 'LOSS');

      console.log(`\n📊 ${symbol} Analysis:`);
      console.log(`   Win Rate: ${winRate}% (${wins}/${total})`);
      console.log(`   Average Error: ${avgError.toFixed(1)}%`);

      if (failures.length > 0) {
        console.log(`   Failure Patterns:`);

        // High RSI failures
        const highRsiFailures = failures.filter(f => parseFloat(f.rsi_at_prediction) > 70);
        if (highRsiFailures.length > 0) {
          console.log(`   - High RSI (>70) failures: ${highRsiFailures.length}`);
        }

        // Low RVol failures
        const lowRvolFailures = failures.filter(f => parseFloat(f.rvol_at_prediction) < 0.8);
        if (lowRvolFailures.length > 0) {
          console.log(`   - Low RVol (<0.8) failures: ${lowRvolFailures.length}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing bias adjustments:', error);
  }
}

async function runHistoricalSimulation(): Promise<void> {
  console.log('🚀 Starting Historical Simulation Training Camp...');
  console.log('📈 Simulating predictions for the last 60 days');

  if (!getOpenAIKey()) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }

  let totalSimulations = 0;
  let successfulSimulations = 0;

  // For each ticker
  for (const ticker of TOP_TICKERS) {
    try {
      console.log(`\n🔄 Processing ${ticker}...`);

      // Fetch 60 days of historical data
      const historicalData = await fetchHistoricalData(ticker, 60);
      if (historicalData.length < 30) {
        console.log(`⚠️ Insufficient historical data for ${ticker}, skipping`);
        continue;
      }

      // Simulate predictions for every Monday in the dataset
      const mondays = historicalData.filter(dataPoint => {
        const dayOfWeek = dataPoint.date.getDay(); // 0 = Sunday, 1 = Monday
        return dayOfWeek === 1; // Only Mondays
      });

      console.log(`📅 Found ${mondays.length} Mondays to simulate for ${ticker}`);

      for (const monday of mondays) {
        totalSimulations++;

        // Skip if we don't have enough future data
        const mondayIndex = historicalData.findIndex(d => d.date.getTime() === monday.date.getTime());
        if (mondayIndex === -1 || mondayIndex >= historicalData.length - 7) {
          console.log(`⚠️ Not enough future data for ${monday.date.toDateString()}, skipping`);
          continue;
        }

        const simulationResult = await generateHistoricalPrediction(ticker, historicalData, monday.date);
        if (simulationResult) {
          await saveSimulationResult(simulationResult);
          successfulSimulations++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Failed to process ${ticker}:`, error);
    }
  }

  console.log(`\n🎉 Historical Simulation Complete!`);
  console.log(`✅ Successful Simulations: ${successfulSimulations}/${totalSimulations}`);

  // Analyze results and generate bias adjustments
  await analyzeBiasAdjustments();
}

// Run the simulation
runHistoricalSimulation()
  .then(() => {
    console.log('🏁 Historical simulation training camp completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Simulation failed:', error);
    process.exit(1);
  });
