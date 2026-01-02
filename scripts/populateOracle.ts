import OpenAI from 'openai';
import { db } from '../server/db';
import { predictions } from '../shared/schema';
import { runMarketScan } from '../server/lib/sentinel';
import { desc, eq } from 'drizzle-orm';

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

// Top tickers to analyze
const TOP_TICKERS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA'];

interface MarketAnalysis {
  ticker: string;
  currentPrice: number;
  rsi: number;
  rvol: number;
}

interface AIPrediction {
  prediction: string;
  confidence: number;
  targetPrice: number;
  learningNote?: string; // Internal learning note (not stored in DB)
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
      rvol: historicalData.rvol
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
    rvol: Math.round(rvol * 100) / 100
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

    if (historicalPredictions.length === 0) {
      return `No historical predictions found for ${ticker}. This is the first analysis.`;
    }

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

    return `Last ${historicalPredictions.length} ${ticker} predictions: ${outcomeSequence}. Win rate: ${winRate}%. Average error: ${avgError}%. Recent pattern shows ${wins} wins vs ${losses} losses.`;

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
  "learning_note": "A brief internal note on how this prediction was adjusted based on past performance."
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
  aiPrediction: AIPrediction
): Promise<void> {
  try {
    console.log(`💾 Saving prediction for ${ticker} to database...`);

    await db.insert(predictions).values({
      symbol: ticker,
      prediction: aiPrediction.prediction,
      confidence: aiPrediction.confidence,
      target_price: aiPrediction.targetPrice.toString(),
      timeframe: '1W' // 1 week as requested
    });

    console.log(`✅ Saved prediction for ${ticker}`);
  } catch (error) {
    console.error(`❌ Error saving prediction for ${ticker}:`, error);
  }
}

async function populateOracle(): Promise<void> {
  console.log('🚀 Starting Oracle Population Script...');
  console.log('📈 Analyzing tickers:', TOP_TICKERS.join(', '));

  if (!getOpenAIKey()) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const ticker of TOP_TICKERS) {
    try {
      console.log(`\n🔄 Processing ${ticker}...`);

      // Step 1: Get market data
      const marketData = await getMarketDataForTicker(ticker);
      if (!marketData) {
        console.log(`⏭️  Skipping ${ticker} - no market data`);
        errorCount++;
        continue;
      }

      console.log(`📊 ${ticker}: RSI=${marketData.rsi}, RVol=${marketData.rvol}, Price=$${marketData.currentPrice}`);

      // Step 2: Get AI prediction
      const aiPrediction = await getAIPrediction(marketData);
      console.log(`🤖 ${ticker} Prediction: ${aiPrediction.prediction.substring(0, 100)}...`);
      console.log(`🎯 Confidence: ${aiPrediction.confidence}%, Target: $${aiPrediction.targetPrice}`);
      if (aiPrediction.learningNote) {
        console.log(`📝 Learning: ${aiPrediction.learningNote}`);
      }

      // Step 3: Save to database
      await savePredictionToDatabase(ticker, marketData, aiPrediction);
      successCount++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to process ${ticker}:`, error);
      errorCount++;
    }
  }

  console.log(`\n🎉 Oracle Population Complete!`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total predictions added to database: ${successCount}`);
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
