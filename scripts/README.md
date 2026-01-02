# Oracle Population Script

This script automatically populates the Sentinel Oracle with AI-generated market predictions.

## What It Does

1. **Scans Top Tickers**: SPY, QQQ, AAPL, NVDA, TSLA
2. **Fetches Market Data**: Uses Finnhub API for current price, RSI, and Relative Volume
3. **AI Analysis**: Sends data to OpenAI GPT-4o with structured JSON prompts for institutional-grade predictions
4. **Database Storage**: Saves predictions to the Neon PostgreSQL database

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

## Example Output

```
🚀 Starting Oracle Population Script...
📈 Analyzing tickers: SPY, QQQ, AAPL, NVDA, TSLA

🔄 Processing SPY...
📊 Fetching market data for SPY...
📊 SPY real data: Price=$681.92, RSI=50, RVol=1
🤖 Getting AI prediction for SPY...
🤖 SPY Prediction: The SPY is expected to trade sideways given the neutral RSI...
🎯 Confidence: 65%, Target: $685.50
💾 Saving prediction for SPY to database...
✅ Saved prediction for SPY

🔄 Processing QQQ...
📊 Fetching market data for QQQ...
📊 QQQ real data: Price=$614.31, RSI=50, RVol=1
🤖 Getting AI prediction for QQQ...
🤖 QQQ Prediction: Given that the RSI is neutral at 50 and the RVol is average...
🎯 Confidence: 65%, Target: $616.50
💾 Saving prediction for QQQ to database...
✅ Saved prediction for QQQ

🎉 Oracle Population Complete!
✅ Successful: 5
❌ Errors: 0
📊 Total predictions added to database: 5
```

## Integration

The populated predictions are served by the `/api/oracle/daily` endpoint for the frontend Oracle component.

## Related Scripts

- **`checkAccuracy.ts`**: Evaluates prediction accuracy against real market data
- **`README-accuracy.md`**: Documentation for the accuracy checker
