import { runMarketScan } from './server/lib/sentinel';

console.log("🦅 Initializing Sentinel Test...");
console.log("--------------------------------");

async function test() {
  try {
    const start = Date.now();
    console.log("📡 Scanning Market (This may take 5-10 seconds)...");
    
    const results = await runMarketScan();
    
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✅ Scan Complete in ${duration}s`);
    console.log(`📊 Found ${results.length} Stocks\n`);

    if (results.length > 0) {
      console.table(results.map(r => ({
        Ticker: r.ticker,
        Price: r.price,
        RSI: r.rsi,
        Sentiment: r.sentimentScore,
        Verdict: r.verdict,
        Signal: r.signal
      })));
    } else {
      console.log("⚠️ No results found. (Check internet connection or API limits)");
    }

  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

test();
