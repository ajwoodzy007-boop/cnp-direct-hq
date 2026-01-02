# Prediction Accuracy Checker

This script evaluates the accuracy of Sentinel Oracle predictions by comparing them against real market performance.

## What It Does

1. **Scans Database**: Finds all predictions where `outcome` is null (ungraded)
2. **Fetches Live Prices**: Uses Finnhub API to get current stock prices
3. **Analyzes Predictions**: Determines if bullish/bearish predictions were correct
4. **Updates Database**: Saves WIN/LOSS outcomes with current price and timestamp

## Prediction Logic

- **Bullish Prediction**: Wins if current price >= target price
- **Bearish Prediction**: Wins if current price <= target price
- **Neutral/Other**: Wins if current price moved closer to target than original position

## Database Schema

Requires these columns in `predictions` table:
```sql
outcome TEXT,           -- 'WIN' or 'LOSS'
outcome_price DECIMAL,  -- Price when graded
outcome_date TIMESTAMP  -- When graded
```

## Usage

```bash
# First, ensure database has outcome columns
psql [your-neon-connection] < scripts/add-outcome-columns.sql

# Then run the accuracy checker
npm run check-accuracy
```

## Environment Variables

- `FINNHUB_API_KEY`: Required for live price data

## Example Output

```
🎯 Starting Prediction Accuracy Check...
📊 Found 15 ungraded predictions

🔍 Grading prediction for SPY (ID: 123)
📊 SPY current price: $485.20
📈 SPY: Current=$485.20, Target=$480.00, Outcome=WIN
✅ Updated SPY prediction: WIN

🔍 Grading prediction for TSLA (ID: 124)
📊 TSLA current price: $225.50
📈 TSLA: Current=$225.50, Target=$250.00, Outcome=LOSS
✅ Updated TSLA prediction: LOSS

🎉 Accuracy Check Complete!
✅ Successfully graded: 15
❌ Errors: 0
```

## Integration

The graded predictions can be used to:
- Calculate win rates for the Oracle
- Display historical accuracy in the UI
- Improve future prediction algorithms
