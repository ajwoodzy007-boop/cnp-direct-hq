import express from 'express';
import OpenAI from 'openai';
import YahooFinance from 'yahoo-finance2';
import { requirePremium } from '../middleware/premium';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

// GET: Quick analyze (existing)
router.get('/analyze', requirePremium, async (req, res) => {
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

// POST: AI-Powered Playbook Generation
router.post('/playbook', requirePremium, async (req, res) => {
  const { ticker, capital, riskProfile } = req.body;

  if (!ticker) {
    return res.status(400).json({ success: false, error: "Ticker required" });
  }

  try {
    // 1. Get Real-Time Data
    const quote = await yf.quote(ticker) as any;
    const price = quote.regularMarketPrice;
    
    // 2. The Prompt: Ask the AI for a structured battle plan
    const prompt = `
      Act as an elite Options Strategist. Create a trading playbook for ${ticker} (Price: $${price}).
      
      User Profile:
      - Capital Available: $${capital || 10000}
      - Risk Tolerance: ${riskProfile || 'Moderate'}
      
      Output strictly JSON with these fields:
      {
        "strategyName": "Name (e.g. Iron Condor, Long Call)",
        "thesis": "Why this trade? (Market conditions)",
        "setup": {
          "entryZone": "Price range to enter",
          "profitTarget": "Price to sell",
          "stopLoss": "Price to bail"
        },
        "legs": [
          {"action": "Buy/Sell", "type": "Call/Put", "strike": "Strike Price", "expiry": "Date/Term"}
        ],
        "greeks": {
          "delta": "Value & Explanation",
          "theta": "Value & Explanation"
        },
        "riskScore": "1-10 (10 is high risk)"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const playbook = JSON.parse(completion.choices[0].message.content || '{}');
    
    res.json({ success: true, data: { ...playbook, currentPrice: price } });

  } catch (error: any) {
    console.error("Strategist Error:", error);
    res.status(500).json({ success: false, error: "Strategy Generation Failed" });
  }
});

export default router;
