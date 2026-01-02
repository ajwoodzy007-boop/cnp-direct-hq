# Oracle Population Script

This script automatically populates the Sentinel Oracle with AI-generated market predictions.

## What It Does

1. **Scans Expanded Universe**: 30+ most liquid stocks across all major sectors (Tech, Financials, Healthcare, Consumer, Energy, Industrials, ETFs)
2. **Rate-Limited Batching**: Processes in batches of 5 with 2-second delays to respect Finnhub's 60 calls/minute limit
3. **Recursive AI Learning**: Incorporates historical performance data and simulation insights for improved accuracy
4. **Institutional Analysis**: Combines technical indicators with macro-economic awareness and sector-specific patterns
5. **Database Storage**: Saves predictions with learning metadata to the Neon PostgreSQL database

## Usage

```bash
npm run populate-oracle
```

## Environment Variables Required

- `FINNHUB_API_KEY`: For market data fetching (optional - uses enhanced mock data if missing)
- `OPENAI_API_KEY`: For AI prediction generation (optional - uses mock predictions if missing)

## Fallback Behavior

- **Finnhub API fails**: Uses realistic mock market data
- **OpenAI API fails**: Uses predefined mock predictions
- **Database fails**: Script exits with error code

## Database Schema

The script populates the `predictions` table with:

```sql
{
  symbol: string,      // Ticker symbol (SPY, AAPL, etc.)
  prediction: string,  // AI-generated prediction text
  confidence: number,  // 0-100 confidence score
  target_price: string, // Predicted price as string
  timeframe: string,   // Always "1W" (1 week)
  created_at: timestamp
}
```

## Expanded Universe

**Technology (8)**: AAPL, MSFT, NVDA, GOOGL, META, AMZN, TSLA, AMD
**Financials (8)**: JPM, BAC, WFC, GS, MS, V, MA, AXP
**Healthcare (8)**: UNH, JNJ, PFE, ABT, TMO, CVS, CI, MDT
**Consumer (8)**: WMT, HD, MCD, KO, PEP, COST, NKE, SBUX
**Energy & Industrials (8)**: XOM, CVX, COP, BA, CAT, HON, UPS, RTX
**ETFs & Communications (7)**: SPY, QQQ, IWM, VTI, BND, GLD, T, VZ, CMCSA, NFLX, DIS

## AI Learning Features

- **Historical Context**: Analyzes past prediction performance for each ticker
- **Simulation Insights**: Incorporates back-testing results to identify biases
- **Sector Awareness**: Adjusts analysis based on sector-specific patterns
- **Macro Integration**: Considers broader market trends and economic indicators

## Example Output

```
🚀 Starting Oracle Population Script...
📈 Analyzing tickers: AAPL, MSFT, NVDA, GOOGL, META, AMZN, TSLA, AMD, JPM, BAC...
📊 Processing 30 tickers in batches of 5
⏱️  Rate limiting: 2000ms between tickers, 12000ms between batches

🎯 Processing batch 1/6: AAPL, MSFT, NVDA, GOOGL, META

🔄 Processing AAPL...
🧠 Fetching historical learning data for AAPL...
📚 Historical learning: SIMULATION INSIGHTS: High RSI signals are unreliable (7 failures)
📊 AAPL: RSI=68.5, RVol=1.2, Price=$185.50
🤖 Getting AI prediction for AAPL...
📝 Learning Note: Reduced confidence due to high RSI failure pattern in simulations
🎯 Confidence: 72%, Target: $188.25

⏳ Waiting 2000ms before next ticker...

🎉 Oracle Population Complete!
✅ Successful: 28
❌ Errors: 2
📊 Total predictions added to database: 28
```

## Integration

The populated predictions are served by the `/api/oracle/daily` endpoint for the frontend Oracle component.

## Related Scripts

- **`checkAccuracy.ts`**: Evaluates prediction accuracy against real market data
- **`README-accuracy.md`**: Documentation for the accuracy checker
