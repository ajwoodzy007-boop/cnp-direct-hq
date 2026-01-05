import { db } from '../server/db.js';
import { historicalPrices } from '../shared/schema.js';

// Core 51 tickers for backfill
const CORE_51 = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AMD',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP',
  'UNH', 'JNJ', 'PFE', 'ABT', 'TMO', 'CVS', 'CI', 'MDT',
  'WMT', 'HD', 'MCD', 'KO', 'PEP', 'COST', 'NKE', 'SBUX',
  'XOM', 'CVX', 'COP', 'BA', 'CAT', 'HON', 'UPS', 'RTX',
  'SPY', 'QQQ', 'IWM', 'VTI', 'BND', 'GLD',
  'T', 'VZ', 'CMCSA', 'NFLX', 'DIS'
];

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error('❌ FINNHUB_API_KEY not found in environment variables');
  process.exit(1);
}

interface HistoricalData {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
}

async function fetchHistoricalData(symbol: string, days: number = 30): Promise<HistoricalData | null> {
  try {
    console.log(`📊 Fetching ${days} days of historical data for ${symbol}...`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const from = Math.floor(startDate.getTime() / 1000);
    const to = Math.floor(endDate.getTime() / 1000);

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Finnhub API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.c || data.c.length === 0) {
      console.error(`❌ No historical data available for ${symbol}`);
      return null;
    }

    console.log(`✅ Retrieved ${data.c.length} days of data for ${symbol}`);
    return data;

  } catch (error) {
    console.error(`❌ Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

async function calculateRSI(closes: number[], period: number = 14): Promise<number> {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function saveHistoricalData(symbol: string, data: HistoricalData): Promise<number> {
  let savedCount = 0;

  try {
    // Process each day
    for (let i = 0; i < data.c.length; i++) {
      const timestamp = data.t[i] * 1000; // Convert to milliseconds
      const date = new Date(timestamp);

      // Skip if data is incomplete
      if (!data.o[i] || !data.h[i] || !data.l[i] || !data.c[i] || !data.v[i]) {
        continue;
      }

      // Calculate RSI for this day using available closes up to this point
      const closesSoFar = data.c.slice(0, i + 1);
      const rsi = await calculateRSI(closesSoFar);

      // Calculate simple moving average (50-day)
      const sma50 = i >= 49 ? data.c.slice(i - 49, i + 1).reduce((sum, price) => sum + price, 0) / 50 : null;

      try {
        await db.insert(historicalPrices).values({
          ticker: symbol,
          date: date,
          open_price: data.o[i].toString(),
          high_price: data.h[i].toString(),
          low_price: data.l[i].toString(),
          close_price: data.c[i].toString(),
          volume: data.v[i],
          rsi: rsi.toString(),
          moving_avg_50: sma50 ? sma50.toString() : null
        });

        savedCount++;
      } catch (insertError) {
        // Skip duplicates - data might already exist
        if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          console.log(`⏭️  Skipping duplicate data for ${symbol} on ${date.toISOString().split('T')[0]}`);
        } else {
          console.error(`❌ Error saving data for ${symbol}:`, insertError.message);
        }
      }
    }

    console.log(`💾 Saved ${savedCount} days of historical data for ${symbol}`);
    return savedCount;

  } catch (error) {
    console.error(`❌ Error saving historical data for ${symbol}:`, error);
    return 0;
  }
}

async function backfillHistory(): Promise<void> {
  console.log('🕒 Starting 30-Day History Backfill...');
  console.log(`📊 Processing ${CORE_51.length} Core 51 tickers`);
  console.log('⏱️  This will take several minutes due to API rate limits...');

  let totalSaved = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const symbol of CORE_51) {
    console.log(`\n🔄 Processing ${symbol}...`);

    const historicalData = await fetchHistoricalData(symbol, 30);

    if (!historicalData) {
      console.log(`❌ Failed to fetch data for ${symbol}`);
      errorCount++;
      continue;
    }

    const savedCount = await saveHistoricalData(symbol, historicalData);

    if (savedCount > 0) {
      successCount++;
      totalSaved += savedCount;
    } else {
      errorCount++;
    }

    // Rate limiting - avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 History Backfill Complete!');
  console.log(`✅ Successful tickers: ${successCount}/${CORE_51.length}`);
  console.log(`❌ Failed tickers: ${errorCount}`);
  console.log(`💾 Total data points saved: ${totalSaved}`);

  if (successCount > 0) {
    console.log('\n🚀 System now has historical context for AI learning!');
    console.log('📊 Oracle will use historical performance analysis');
    console.log('📈 Radar charts will show proper historical trends');
    console.log('🔥 System heat will calculate real volatility');
  }
}

// Run the backfill
backfillHistory()
  .then(() => {
    console.log('\n🏁 History backfill script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 History backfill script failed:', error);
    process.exit(1);
  });
