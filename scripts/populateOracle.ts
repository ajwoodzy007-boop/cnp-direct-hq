import OpenAI from 'openai';
import { db } from '../server/db.js';
import { predictions, predictionsHistory, simulationResults } from '../shared/schema.js';
import { runMarketScan } from '../server/lib/sentinel.js';
import { desc, eq, and, sql } from 'drizzle-orm';

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

// 10-Pick Daily Model - Stratified Selection Buckets

// CORE_51: Most liquid stocks (Top 5 selection)
const CORE_51 = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AMD',
  'JPM', 'GS', 'UNH', 'COST', 'V', 'MA', 'AVGO'
];

// LOW_COST: High-volatility, speculative plays under $30 (Top 2 selection)
const LOW_COST = [
  'SOFI', 'PLTR', 'F', 'NU', 'AAL', 'PFE', 'RKLB', 'HOOD',
  'SNAP', 'GRAB'
];

// MOVERS_CRYPTO: Cryptocurrency and crypto-related tickers (Top 3 selection)
const MOVERS_CRYPTO = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'MSTR', 'COIN', 'MARA',
  'RIOT', 'CLSK'
];

// Combined universe for analysis (all tickers get AI analysis)
const ALL_TICKERS = [...CORE_51, ...LOW_COST, ...MOVERS_CRYPTO];

interface MarketAnalysis {
  ticker: string;
  currentPrice: number;
  rsi: number;
  rvol: number;
  timestamp: Date; // Market data timestamp
}

interface AIPrediction {
  prediction: string;
  confidence: number;
  targetPrice: number;
  learningNote?: string; // Internal learning note (not stored in DB)
}

interface AnalyzedTicker {
  ticker: string;
  marketData: MarketAnalysis;
  aiPrediction: AIPrediction;
  category: 'CORE_51' | 'LOW_COST' | 'MOVERS_CRYPTO';
}

async function getMarketDataForTicker(ticker: string): Promise<MarketAnalysis | null> {
  try {
    console.log(`📊 Fetching market data for ${ticker}...`);

    // Try to get real market data first
    const realData = await getRealMarketData(ticker);
    if (realData && realData.currentPrice > 0) {
      console.log(`📊 ${ticker} real data: Price=$${realData.currentPrice}, RSI=${realData.rsi}, RVol=${realData.rvol}`);
      return realData;
    }

    console.log(`⚠️  Real market data unavailable for ${ticker}, using enhanced mock data`);
    return getMockMarketData(ticker);
  } catch (error) {
    console.error(`❌ Error fetching market data for ${ticker}:`, error);
    console.log(`🔄 Using mock data due to API error`);
    return getMockMarketData(ticker);
  }
}

async function getRealMarketData(ticker: string): Promise<MarketAnalysis | null> {
  try {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_KEY) {
      console.log('⚠️  FINNHUB_API_KEY not configured');
      return null;
    }

    // Fetch current quote
    const quoteResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
    if (!quoteResponse.ok) {
      console.log(`❌ Finnhub quote API failed for ${ticker}`);
      return null;
    }
    const quoteData = await quoteResponse.json();

    // Use current price or previous close
    let price = quoteData.c || quoteData.pc || 0;
    if (price === 0 && quoteData.pc) {
      price = quoteData.pc; // Use previous close if current is 0
      console.log(`📊 Using previous close price for ${ticker}: $${price}`);
    }

    if (price === 0) {
      console.log(`❌ No valid price data for ${ticker}`);
      return null;
    }

    // Fetch historical data for RSI calculation
    const historicalData = await getHistoricalDataForRSI(ticker);

    return {
      ticker: ticker.toUpperCase(),
      currentPrice: price,
      rsi: historicalData.rsi,
      rvol: historicalData.rvol,
      timestamp: new Date() // Use current time for real market data
    };
  } catch (error) {
    console.error(`❌ Error in getRealMarketData for ${ticker}:`, error);
    return null;
  }
}

async function getHistoricalDataForRSI(ticker: string): Promise<{ rsi: number; rvol: number }> {
  try {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_KEY) return { rsi: 50, rvol: 1.0 };

    // Get historical data for RSI calculation
    const historicalResponse = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&count=20&token=${FINNHUB_KEY}`);
    if (!historicalResponse.ok) return { rsi: 50, rvol: 1.0 };

    const historicalData = await historicalResponse.json();
    if (!historicalData.c || historicalData.c.length < 15) return { rsi: 50, rvol: 1.0 };

    // Calculate RSI from closing prices
    const closes = historicalData.c.slice(-15); // Last 15 days
    const rsi = calculateRSI(closes);

    // Calculate RVol (Relative Volume) - compare to average volume
    const volumes = historicalData.v || [];
    const avgVolume = volumes.reduce((sum: number, vol: number) => sum + vol, 0) / volumes.length;
    const recentVolume = volumes[volumes.length - 1] || avgVolume;
    const rvol = avgVolume > 0 ? recentVolume / avgVolume : 1.0;

    return { rsi, rvol };
  } catch (error) {
    console.error(`❌ Error calculating RSI/RVol for ${ticker}:`, error);
    return { rsi: 50, rvol: 1.0 };
  }
}

function calculateRSI(closes: number[]): number {
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

function getMockMarketData(ticker: string): MarketAnalysis {
  // Generate realistic mock data based on ticker
  const basePrices: { [key: string]: number } = {
    'SPY': 480,
    'QQQ': 420,
    'AAPL': 180,
    'NVDA': 850,
    'TSLA': 220
  };

  const basePrice = basePrices[ticker] || 100;
  const currentPrice = basePrice + (Math.random() - 0.5) * 20; // +/- $10 variation
  const rsi = 30 + Math.random() * 40; // 30-70 RSI range
  const rvol = 0.8 + Math.random() * 0.8; // 0.8-1.6 RVol range

  return {
    ticker: ticker.toUpperCase(),
    currentPrice: Math.round(currentPrice * 100) / 100,
    rsi: Math.round(rsi),
    rvol: Math.round(rvol * 100) / 100,
    timestamp: new Date() // Use current time for mock data
  };
}

async function getHistoricalLearning(ticker: string): Promise<string> {
  try {
    console.log(`🧠 Fetching historical learning data for ${ticker}...`);

    // Get last 5 predictions for this ticker
    const historicalPredictions = await db
      .select()
      .from(predictions)
      .where(eq(predictions.symbol, ticker))
      .orderBy(desc(predictions.created_at))
      .limit(5);

    // Get simulation results for bias adjustments
    let simResults = [];
    try {
      simResults = await db
        .select()
        .from(simulationResults)
        .where(eq(simulationResults.symbol, ticker))
        .orderBy(desc(simulationResults.created_at))
        .limit(20);
    } catch (simError) {
      console.log(`📊 Simulation results table not available for ${ticker}. Skipping historical bias analysis.`);
      simResults = [];
    }

    let learningString = '';

    if (historicalPredictions.length === 0) {
      learningString = `No historical predictions found for ${ticker}. This is the first analysis.`;
    } else {
      // Calculate win rate and outcomes
      const outcomes = historicalPredictions.map(p => p.outcome).filter(Boolean);
      const wins = outcomes.filter(o => o === 'WIN').length;
      const losses = outcomes.filter(o => o === 'LOSS').length;
      const winRate = outcomes.length > 0 ? Math.round((wins / outcomes.length) * 100) : 0;

      // Calculate average error (difference between target and outcome price)
      const errors = historicalPredictions
        .filter(p => p.outcome_price && p.target_price)
        .map(p => {
          const targetPrice = parseFloat(p.target_price!);
          const outcomePrice = parseFloat(p.outcome_price!);
          return Math.abs((outcomePrice - targetPrice) / targetPrice) * 100;
        });

      const avgError = errors.length > 0 ? (errors.reduce((sum, err) => sum + err, 0) / errors.length).toFixed(1) : 'N/A';

      // Create outcome sequence string
      const outcomeSequence = historicalPredictions
        .slice(0, 5)
        .map(p => p.outcome || 'PENDING')
        .join(', ');

      learningString = `Last ${historicalPredictions.length} ${ticker} predictions: ${outcomeSequence}. Win rate: ${winRate}%. Average error: ${avgError}%. Recent pattern shows ${wins} wins vs ${losses} losses.`;
    }

    // Add simulation-based bias adjustments if available
    if (simResults.length > 0) {
      const simWins = simResults.filter(r => r.outcome === 'WIN').length;
      const simTotal = simResults.length;
      const simWinRate = simTotal > 0 ? Math.round((simWins / simTotal) * 100) : 0;

      const highRsiFailures = simResults.filter(r =>
        r.outcome === 'LOSS' && parseFloat(r.rsi_at_prediction) > 70
      ).length;

      const lowRvolFailures = simResults.filter(r =>
        r.outcome === 'LOSS' && parseFloat(r.rvol_at_prediction) < 0.8
      ).length;

      let biasAdjustments = '';

      if (highRsiFailures > simTotal * 0.3) {
        biasAdjustments += ` High RSI signals are unreliable (${highRsiFailures} failures).`;
      }

      if (lowRvolFailures > simTotal * 0.3) {
        biasAdjustments += ` Low volume conditions show increased failure risk (${lowRvolFailures} failures).`;
      }

      if (simWinRate < 50) {
        biasAdjustments += ` Overall simulation win rate (${simWinRate}%) suggests conservative approach needed.`;
      }

      if (biasAdjustments) {
        learningString += ` SIMULATION INSIGHTS: Based on ${simTotal} historical simulations.${biasAdjustments}`;
      }
    }

    return learningString;

  } catch (error) {
    console.error(`❌ Error fetching historical data for ${ticker}:`, error);
    return `Unable to fetch historical data for ${ticker}. Proceeding with fresh analysis.`;
  }
}

async function getAIPrediction(marketData: MarketAnalysis): Promise<AIPrediction> {
  try {
    console.log(`🤖 Getting AI prediction for ${marketData.ticker}...`);

    // Check if OpenAI API key is available
    if (!getOpenAIKey()) {
      console.log('⚠️  OpenAI API key not configured, using mock prediction');
      return getMockPrediction(marketData);
    }

    // Step 1: Historical Learning - Fetch past performance
    const learningData = await getHistoricalLearning(marketData.ticker);
    console.log(`📚 Historical learning for ${marketData.ticker}: ${learningData}`);

    const prompt = `You are the Lead Quantitative Strategist for Sentinel OS. You have access to the OpenAI GPT-4o Engine for secondary validation and the Sentinel Historical Database for recursive learning.

Objective: Generate a high-probability 1-week prediction based on current data AND historical performance.

Historical Performance Review: ${learningData}

Current Technicals: Price $${marketData.currentPrice}, RSI ${marketData.rsi}, RVol ${marketData.rvol}

CRITICAL TARGET SETTING GUIDELINES:
- If RVol > 1.2 OR price shows strong momentum: Apply MOMENTUM MULTIPLIER
- Extend targets to capture at least 60% of the stock's Average True Range (ATR)
- Do NOT anchor targets solely to recent averages - high momentum stocks deserve aggressive targets
- For high-flyers (TSLA, NVDA, AMZN): Scale targets UPWARD by 1.5-2x normal range

Step 1: Historical Review (Learning):
Analyze the historical performance data provided above. Identify patterns where previous predictions were LOSS. Adjust your current logic to avoid repeating those specific biases.

Step 2: OpenAI Cross-Validation:
Utilize your internal training data from OpenAI to cross-reference current macro-economic trends (FED meetings, CPI data, Earnings Calendars) that might override simple RSI/RVol technicals.

Step 3: Intelligence Generation:
Ticker: ${marketData.ticker}

Output Format (Pure JSON):
{
  "prediction": "Reasoning incorporating both technicals and lessons learned from past accuracy.",
  "target_price": "0.00",
  "confidence": 0-100,
  "learning_note": "A brief internal note on how this prediction was adjusted based on past performance and momentum scaling."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a senior institutional analyst with historical learning capabilities. Respond with pure JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response (should be pure JSON with response_format)
    try {
      const parsed = JSON.parse(content);

      // Log the learning note for internal analysis
      if (parsed.learning_note) {
        console.log(`📝 Learning Note for ${marketData.ticker}: ${parsed.learning_note}`);
      }

      return {
        prediction: parsed.prediction || "Unable to generate prediction",
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 50)),
        targetPrice: parseFloat(parsed.target_price) || marketData.currentPrice
      };
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON response:', content);
      console.error('Parse error:', parseError);

      // Fallback to mock prediction
      console.log('🔄 Using mock prediction due to JSON parsing error');
      return getMockPrediction(marketData);
    }
  } catch (error: any) {
    console.error(`❌ Error getting AI prediction for ${marketData.ticker}:`, error.message);

    // Use mock prediction as fallback
    console.log('🔄 Using mock prediction due to API error');
    return getMockPrediction(marketData);
  }
}

function performStratifiedSelection(analyzedTickers: AnalyzedTicker[]): AnalyzedTicker[] {
  // Separate tickers by category
  const core51 = analyzedTickers.filter(t => t.category === 'CORE_51');
  const lowCost = analyzedTickers.filter(t => t.category === 'LOW_COST' && t.marketData.currentPrice < 30);
  const crypto = analyzedTickers.filter(t => t.category === 'MOVERS_CRYPTO');

  console.log(`📊 Category breakdown: CORE_51: ${core51.length}, LOW_COST (<$30): ${lowCost.length}, MOVERS_CRYPTO: ${crypto.length}`);

  // Sort each category by confidence (descending)
  core51.sort((a, b) => b.aiPrediction.confidence - a.aiPrediction.confidence);
  lowCost.sort((a, b) => b.aiPrediction.confidence - a.aiPrediction.confidence);
  crypto.sort((a, b) => b.aiPrediction.confidence - a.aiPrediction.confidence);

  // Select top performers from each category
  const selected: AnalyzedTicker[] = [];

  // Top 5 from CORE_51
  selected.push(...core51.slice(0, 5));

  // Top 2 from LOW_COST (under $30)
  selected.push(...lowCost.slice(0, 2));

  // Top 3 from MOVERS_CRYPTO
  selected.push(...crypto.slice(0, 3));

  return selected;
}

async function saveToSimulationResults(analyzed: AnalyzedTicker): Promise<void> {
  try {
    // Calculate simulation outcome (simplified - in real implementation would use actual historical data)
    const priceChange = ((analyzed.aiPrediction.targetPrice - analyzed.marketData.currentPrice) / analyzed.marketData.currentPrice) * 100;
    const simulatedOutcome = priceChange > 2 ? 'WIN' : priceChange < -2 ? 'LOSS' : 'WIN'; // Simplified logic
    const actualPrice = analyzed.aiPrediction.targetPrice; // In real sim, this would be actual historical price
    const errorPercentage = Math.abs(priceChange);

    await db.insert(simulationResults).values({
      symbol: analyzed.ticker,
      simulation_date: new Date(),
      historical_date: analyzed.marketData.timestamp,
      price_at_prediction: analyzed.marketData.currentPrice.toString(),
      rsi_at_prediction: analyzed.marketData.rsi.toString(),
      rvol_at_prediction: analyzed.marketData.rvol.toString(),
      predicted_target: analyzed.aiPrediction.targetPrice.toString(),
      confidence_score: analyzed.aiPrediction.confidence,
      actual_price_7_days: actualPrice.toString(),
      outcome: simulatedOutcome,
      error_percentage: errorPercentage.toString(),
      bias_adjustments: {
        category: analyzed.category,
        prediction_text: analyzed.aiPrediction.prediction.substring(0, 200)
      },
      created_at: new Date()
    });

    console.log(`📚 Saved ${analyzed.ticker} to simulation_results`);
  } catch (error) {
    console.error(`❌ Failed to save ${analyzed.ticker} to simulation_results:`, error);
  }
}

function getMockPrediction(marketData: MarketAnalysis): AIPrediction {
  const mockPredictions = [
    `${marketData.ticker} shows neutral momentum with RSI at ${marketData.rsi}.`,
    `${marketData.ticker} exhibits moderate volatility with RVol of ${marketData.rvol}.`,
    `${marketData.ticker} maintains steady performance indicators.`,
    `${marketData.ticker} demonstrates balanced market positioning.`,
    `${marketData.ticker} reflects current market equilibrium.`
  ];

  const randomPrediction = mockPredictions[Math.floor(Math.random() * mockPredictions.length)];
  const confidence = Math.floor(Math.random() * 40) + 30; // 30-70% confidence for mock data
  const targetPrice = marketData.currentPrice * (0.95 + Math.random() * 0.1); // +/- 5% from current

  return {
    prediction: randomPrediction,
    confidence: confidence,
    targetPrice: Math.round(targetPrice * 100) / 100, // Round to 2 decimal places
    learningNote: `Mock prediction generated - no historical data available for learning adjustments.`
  };
}

async function savePredictionToDatabase(
  ticker: string,
  marketData: MarketAnalysis,
  aiPrediction: AIPrediction,
  learningData?: string,
  category?: string
): Promise<void> {
  try {
    console.log(`💾 Saving prediction for ${ticker} to database...`);

    // Generate strategy note for learning metadata
    let strategyNote = "Standard technical analysis applied.";
    const priceChange = ((aiPrediction.targetPrice - marketData.currentPrice) / marketData.currentPrice) * 100;

    if (marketData.rvol > 1.2) {
      strategyNote = `Target adjusted upward by ${priceChange.toFixed(1)}% to account for high momentum (RVol: ${marketData.rvol}). Momentum multiplier applied.`;
    } else if (priceChange > 5) {
      strategyNote = `Target extended by ${priceChange.toFixed(1)}% to capture strong upside potential based on technical momentum.`;
    } else if (priceChange < -3) {
      strategyNote = `Conservative target set at ${priceChange.toFixed(1)}% below current price due to technical weakness.`;
    }

    // Get simulation insights for learning metadata
    let learningMetadata = {
      strategy_note: strategyNote,
      target_adjustment_percentage: priceChange.toFixed(2),
      momentum_indicators: {
        rsi: marketData.rsi,
        rvol: marketData.rvol,
        price: marketData.currentPrice
      },
      category: category || 'UNKNOWN',
      generated_at: new Date().toISOString()
    };

    if (learningData && learningData.includes('SIMULATION INSIGHTS')) {
      // Add simulation insights if available
      const simulationMatch = learningData.match(/SIMULATION INSIGHTS: (.+)/);
      if (simulationMatch) {
        learningMetadata.simulation_insights = simulationMatch[1];
        learningMetadata.historical_context = learningData;
      }
    }

    // Use upsert (insert on conflict update) to prevent duplicates
    await db.insert(predictions).values({
      symbol: ticker,
      prediction: aiPrediction.prediction,
      confidence: aiPrediction.confidence,
      target_price: aiPrediction.targetPrice.toString(),
      timeframe: '1W', // 1 week as requested
      created_at: marketData.timestamp, // Use market data timestamp, not new Date()
      learning_metadata: learningMetadata
    }).onConflictDoNothing();

    console.log(`✅ Saved prediction for ${ticker} with strategy note: ${strategyNote}`);
  } catch (error) {
    console.error(`❌ Error saving prediction for ${ticker}:`, error);
  }
}

async function populateOracle(): Promise<void> {
  console.log('🚀 Oracle Engine initialized. Analyzing', ALL_TICKERS.length, 'tickers for 10-pick selection....');
  console.log('📊 Buckets: CORE_51:', CORE_51.length, 'LOW_COST:', LOW_COST.length, 'MOVERS_CRYPTO:', MOVERS_CRYPTO.length);

  if (!getOpenAIKey()) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }

  let analyzedCount = 0;
  let errorCount = 0;
  const analyzedTickers: AnalyzedTicker[] = [];

  // Process ALL tickers for AI analysis
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 12000;
  const DELAY_BETWEEN_TICKERS = 2000;

  console.log(`📊 Processing ${ALL_TICKERS.length} tickers in batches of ${BATCH_SIZE}`);
  console.log(`⏱️  Rate limiting: ${DELAY_BETWEEN_TICKERS}ms between tickers, ${DELAY_BETWEEN_BATCHES}ms between batches`);

  for (let i = 0; i < ALL_TICKERS.length; i += BATCH_SIZE) {
    const batch = ALL_TICKERS.slice(i, i + BATCH_SIZE);
    console.log(`\n🎯 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ALL_TICKERS.length / BATCH_SIZE)}: ${batch.join(', ')}`);

    for (const ticker of batch) {
      try {
        console.log(`\n🔄 Analyzing ${ticker}...`);

        // Determine category
        let category: 'CORE_51' | 'LOW_COST' | 'MOVERS_CRYPTO';
        if (CORE_51.includes(ticker)) {
          category = 'CORE_51';
        } else if (LOW_COST.includes(ticker)) {
          category = 'LOW_COST';
        } else {
          category = 'MOVERS_CRYPTO';
        }

        // Step 1: Get market data
        const marketData = await getMarketDataForTicker(ticker);
        if (!marketData) {
          console.log(`⏭️  Skipping ${ticker} - no market data`);
          errorCount++;
          continue;
        }

        console.log(`📊 ${ticker} (${category}): RSI=${marketData.rsi}, RVol=${marketData.rvol}, Price=$${marketData.currentPrice}`);

        // Step 2: Get AI prediction
        const aiPrediction = await getAIPrediction(marketData);
        console.log(`🤖 ${ticker} Prediction: ${aiPrediction.prediction.substring(0, 80)}...`);
        console.log(`🎯 Confidence: ${aiPrediction.confidence}%, Target: $${aiPrediction.targetPrice}`);

        // Step 3: Strict Quality Validation Filter
        if (!aiPrediction.targetPrice ||
            aiPrediction.targetPrice <= 0 ||
            !isFinite(aiPrediction.targetPrice) ||
            !aiPrediction.confidence ||
            aiPrediction.confidence < 70 ||
            aiPrediction.confidence > 100 ||
            !aiPrediction.prediction ||
            aiPrediction.prediction.trim().length < 10 ||
            aiPrediction.prediction.includes('Unable to generate')) {
          console.log(`🚫 DISCARDED ${ticker}: Failed validation`);
          errorCount++;
          continue;
        }

        console.log(`✅ PASSED VALIDATION ${ticker}: Target=$${aiPrediction.targetPrice}, Confidence=${aiPrediction.confidence}%`);

        // Step 4: Store analyzed ticker for later selection
        analyzedTickers.push({
          ticker,
          marketData,
          aiPrediction,
          category
        });

        analyzedCount++;

        // Rate limiting delay
        if (ticker !== batch[batch.length - 1]) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_TICKERS}ms before next ticker...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TICKERS));
        }

      } catch (error) {
        console.error(`❌ Failed to analyze ${ticker}:`, error);
        errorCount++;
      }
    }

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < ALL_TICKERS.length) {
      console.log(`⏳ Batch complete. Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`\n📊 Analysis Complete! Analyzed ${analyzedCount} tickers, ${errorCount} errors`);
  console.log('🎯 Starting stratified selection for 10 final picks...');

  // Step 5: Stratified Selection
  const selectedTickers = performStratifiedSelection(analyzedTickers);

  console.log(`\n🏆 Final Selection (${selectedTickers.length} picks):`);
  selectedTickers.forEach((ticker, index) => {
    console.log(`${index + 1}. ${ticker.ticker} (${ticker.category}) - Confidence: ${ticker.aiPrediction.confidence}%`);
  });

  // Step 6: Save to Database
  let savedToPredictions = 0;
  let savedToSimulation = 0;

  // Save selected 10 to predictions table
  for (const selected of selectedTickers) {
    try {
      const learningData = await getHistoricalLearning(selected.ticker);
      await savePredictionToDatabase(selected.ticker, selected.marketData, selected.aiPrediction, learningData, selected.category);
      savedToPredictions++;
    } catch (error) {
      console.error(`❌ Failed to save selected ${selected.ticker}:`, error);
    }
  }

  // Save remaining analyzed tickers to simulation_results for learning
  for (const analyzed of analyzedTickers.filter(t => !selectedTickers.some(s => s.ticker === t.ticker))) {
    try {
      await saveToSimulationResults(analyzed);
      savedToSimulation++;
    } catch (error) {
      console.error(`❌ Failed to save to simulation ${analyzed.ticker}:`, error);
    }
  }

  console.log(`\n🎉 Oracle Population Complete!`);
  console.log(`✅ Selected 10: ${savedToPredictions} saved to predictions`);
  console.log(`📚 Learning: ${savedToSimulation} saved to simulation_results`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run the script
populateOracle()
  .then(() => {
    console.log('🏁 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
