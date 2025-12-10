import express from 'express';
import YahooFinance from 'yahoo-finance2';

const router = express.Router();
const yf = new YahooFinance();

function generateOptionPlay(ticker: string, price: number, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') {
  const strikeRound = (num: number) => Math.round(num);

  if (sentiment === 'BULLISH') {
    return {
      name: "Bull Call Spread",
      description: "Moderate Bullishness. Capped risk, capped reward.",
      legs: [
        { type: "Buy Call", strike: strikeRound(price), expiry: "30-45 Days" },
        { type: "Sell Call", strike: strikeRound(price * 1.05), expiry: "Same" }
      ],
      greeks: { delta: "0.45", theta: "-0.02" },
      riskProfile: "Defined Risk"
    };
  } 
  
  if (sentiment === 'BEARISH') {
    return {
      name: "Long Put",
      description: "Aggressive Bearishness. Profitable if price tanks.",
      legs: [
        { type: "Buy Put", strike: strikeRound(price * 0.98), expiry: "30 Days" }
      ],
      greeks: { delta: "-0.50", theta: "-0.04" },
      riskProfile: "High Risk / High Reward"
    };
  }

  return {
    name: "Iron Condor",
    description: "Neutral Trend. Profitable if price stays flat.",
    legs: [
      { type: "Sell Put", strike: strikeRound(price * 0.95), expiry: "30 Days" },
      { type: "Sell Call", strike: strikeRound(price * 1.05), expiry: "30 Days" }
    ],
    greeks: { delta: "0.02", theta: "0.05" },
    riskProfile: "Income Generation"
  };
}

router.get('/analyze', async (req, res) => {
  const { ticker } = req.query;
  
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ success: false, error: "Ticker required" });
  }

  try {
    const quote = await yf.quote(ticker) as any;
    const price = quote.regularMarketPrice || 0;
    const change = quote.regularMarketChangePercent || 0;

    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (change > 1.5) trend = 'BULLISH';
    if (change < -1.5) trend = 'BEARISH';

    const strategy = generateOptionPlay(ticker, price, trend);

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        currentPrice: price,
        trend: trend,
        strategy: strategy
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: "Strategist Calculation Failed" });
  }
});

export default router;
