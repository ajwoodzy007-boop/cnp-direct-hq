import express from 'express';
import OpenAI from 'openai';
import YahooFinanceDefault from 'yahoo-finance2';
import { requirePremium } from '../middleware/premium';

// Handle both ESM (dev) and CJS (production) module formats
const YahooFinance = (YahooFinanceDefault as any).default || YahooFinanceDefault;
const yf = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;
const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// POST: AI-Powered Crypto Playbook Generation
router.post('/crypto-playbook', requirePremium, async (req, res) => {
  const { symbol, capital, timeframe, riskProfile } = req.body;

  if (!symbol) {
    return res.status(400).json({ success: false, error: "Crypto symbol required" });
  }

  try {
    // 1. Get Real-Time Crypto Data (append -USD for Yahoo Finance)
    const cryptoSymbol = `${symbol.toUpperCase()}-USD`;
    const quote = await yf.quote(cryptoSymbol) as any;
    const price = quote.regularMarketPrice;
    const change24h = quote.regularMarketChangePercent || 0;
    const high24h = quote.regularMarketDayHigh || price;
    const low24h = quote.regularMarketDayLow || price;
    
    // 2. The Prompt: Ask the AI for a crypto-specific strategy
    const prompt = `
      Act as an elite Cryptocurrency Trading Strategist. Create a trading playbook for ${symbol.toUpperCase()}.
      
      Current Market Data:
      - Price: $${price}
      - 24h Change: ${change24h.toFixed(2)}%
      - 24h High: $${high24h}
      - 24h Low: $${low24h}
      
      User Profile:
      - Capital Available: $${capital || 2000}
      - Trading Timeframe: ${timeframe || 'swing'} (scalp = minutes/hours, swing = days/weeks, hodl = months+)
      - Risk Tolerance: ${riskProfile || 'Moderate'}
      
      Output strictly JSON with these fields:
      {
        "strategyName": "Name (e.g. Breakout Entry, DCA Accumulation, Trend Reversal)",
        "thesis": "Why this trade? (Market conditions, trends, catalysts)",
        "setup": {
          "entryZone": "Price range to enter (e.g. $95,000 - $97,000)",
          "positionSize": "Recommended position size based on capital and risk",
          "target1": "First profit target price",
          "target2": "Second profit target price (extended target)",
          "stopLoss": "Price to exit if trade goes wrong"
        },
        "analysis": {
          "trend": "Current trend direction and strength",
          "support": "Key support levels to watch",
          "resistance": "Key resistance levels to watch"
        },
        "catalysts": ["Catalyst 1", "Catalyst 2", "Catalyst 3"],
        "riskScore": 1-10 (10 is high risk)
      }
      
      Consider crypto-specific factors:
      - 24/7 market volatility
      - Bitcoin correlation
      - On-chain metrics if applicable
      - Macro environment (Fed, regulations)
      - Upcoming network upgrades or halvings
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const playbook = JSON.parse(completion.choices[0].message.content || '{}');
    
    res.json({ success: true, data: { ...playbook, currentPrice: price, symbol: symbol.toUpperCase() } });

  } catch (error: any) {
    console.error("Crypto Strategist Error:", error);
    res.status(500).json({ success: false, error: "Crypto Strategy Generation Failed" });
  }
});

router.get('/earnings-scanner', requirePremium, async (req, res) => {
  const watchlist = [
    'NVDA', 'TSLA', 'NFLX', 'AMD', 'META', 'AMZN', 'GOOGL', 'MSFT', 'AAPL', 'COIN', 'MSTR', 'CRWD',
    'ORCL', 'ADBE', 'CRM', 'COST', 'NKE', 'FDX', 'MU', 'AVGO', 'LULU', 'ACN', 'PANW', 'SNOW',
    'ZS', 'DDOG', 'NET', 'SHOP', 'SQ', 'ROKU', 'ABNB', 'UBER', 'LYFT', 'DASH', 'RBLX', 'PLTR'
  ];
  
  try {
    const promises = watchlist.map(async (ticker) => {
      try {
        const summary = await yf.quoteSummary(ticker, { modules: ['calendarEvents', 'price'] });
        const events = summary.calendarEvents;
        
        if (events && events.earnings && events.earnings.earningsDate && events.earnings.earningsDate.length > 0) {
          const date = new Date(events.earnings.earningsDate[0]);
          const now = new Date();
          const diffTime = date.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 60) {
            return {
              ticker,
              date: date.toLocaleDateString(),
              daysAway: diffDays,
              price: summary.price?.regularMarketPrice
            };
          }
        }
      } catch (e: any) {
        console.log(`Earnings scan skip ${ticker}:`, e.message);
      }
      return null;
    });

    const results = await Promise.all(promises);
    const cleanList = results.filter(r => r !== null).sort((a: any, b: any) => a.daysAway - b.daysAway);
    
    res.json({ success: true, data: cleanList });

  } catch (error) {
    console.error("Earnings Scan Error:", error);
    res.status(500).json({ success: false, error: "Scanner Failed" });
  }
});

router.post('/earnings-play', requirePremium, async (req, res) => {
  const { ticker, price, date } = req.body;

  try {
    const prompt = `
      Act as a Derivatives Specialist. Generate THREE different 'Earnings Plays' for ${ticker}.
      Current Price: $${price}
      Earnings Date: ${date}

      Generate exactly 3 strategies with different risk levels:
      1. LOW RISK - Conservative play (e.g. Iron Condor, Cash-Secured Put, Covered Call, Wide Credit Spread)
      2. MEDIUM RISK - Balanced play (e.g. Bull/Bear Spread, Calendar Spread, Jade Lizard)  
      3. HIGH RISK - Aggressive play (e.g. Long Straddle, Long Strangle, Naked Options, ATM Debit Spread)

      Available strategies to choose from:
      - Long Straddle/Strangle: Big move expected
      - Iron Condor/Butterfly: Expecting flat price
      - Bull Call Spread / Bear Put Spread: Directional bets
      - Calendar Spread: IV crush play
      - Jade Lizard: Bullish with premium
      - Credit/Debit Spreads: Various risk profiles
      
      Output strict JSON with this structure:
      {
        "plays": [
          {
            "strategy": "Strategy Name",
            "risk": "Low",
            "bias": "Bullish / Bearish / Neutral",
            "impliedMove": "±X.X%",
            "rationale": "1-2 sentence explanation",
            "setup": {
              "leg1": "Buy/Sell $XXX Call/Put Expiry",
              "leg2": "Buy/Sell $XXX Call/Put Expiry (or N/A)"
            },
            "maxProfit": "$XXX or Unlimited",
            "maxLoss": "$XXX"
          },
          {
            "strategy": "Strategy Name",
            "risk": "Medium",
            "bias": "...",
            "impliedMove": "...",
            "rationale": "...",
            "setup": { "leg1": "...", "leg2": "..." },
            "maxProfit": "...",
            "maxLoss": "..."
          },
          {
            "strategy": "Strategy Name", 
            "risk": "High",
            "bias": "...",
            "impliedMove": "...",
            "rationale": "...",
            "setup": { "leg1": "...", "leg2": "..." },
            "maxProfit": "...",
            "maxLoss": "..."
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    res.json({ success: true, data: result.plays || [] });

  } catch (error) {
    res.status(500).json({ success: false, error: "Strategy Generation Failed" });
  }
});

// POST: Comprehensive AI Analysis for any ticker (stock or crypto)
router.post('/quick-analyze', requirePremium, async (req, res) => {
  const { ticker, assetType } = req.body;

  if (!ticker) {
    return res.status(400).json({ success: false, error: "Ticker required" });
  }

  try {
    const normalizedTicker = ticker.toUpperCase().trim();
    const isCrypto = assetType === 'crypto';
    
    // Fetch market data
    let symbol = normalizedTicker;
    if (isCrypto) {
      symbol = `${normalizedTicker.replace(/[-_]?USD$/i, '')}-USD`;
    }
    
    const quote = await yf.quote(symbol) as any;
    if (!quote || !quote.regularMarketPrice) {
      return res.status(404).json({ success: false, error: `Could not find data for ${normalizedTicker}` });
    }
    
    const price = quote.regularMarketPrice;
    const change = quote.regularMarketChangePercent || 0;
    const volume = quote.regularMarketVolume || 0;
    const avgVolume = quote.averageDailyVolume10Day || volume;
    const high52 = quote.fiftyTwoWeekHigh || price;
    const low52 = quote.fiftyTwoWeekLow || price;
    const marketCap = quote.marketCap || 0;
    const name = quote.shortName || quote.longName || normalizedTicker;
    
    // Calculate relative volume
    const rvol = avgVolume > 0 ? (volume / avgVolume).toFixed(2) : '1.00';
    
    // Calculate distance from 52-week levels
    const distFromHigh = ((price - high52) / high52 * 100).toFixed(1);
    const distFromLow = ((price - low52) / low52 * 100).toFixed(1);
    
    // AI Analysis
    const prompt = `
You are an elite financial analyst. Provide a comprehensive analysis for ${normalizedTicker} (${name}).

Current Market Data:
- Price: $${price.toFixed(2)}
- Daily Change: ${change.toFixed(2)}%
- Volume: ${volume.toLocaleString()}
- Relative Volume (RVOL): ${rvol}x
- 52-Week High: $${high52.toFixed(2)} (${distFromHigh}% away)
- 52-Week Low: $${low52.toFixed(2)} (+${distFromLow}% from low)
${marketCap > 0 ? `- Market Cap: $${(marketCap / 1e9).toFixed(2)}B` : ''}
- Asset Type: ${isCrypto ? 'Cryptocurrency' : 'Stock'}

Output strictly JSON with these fields:
{
  "summary": "2-3 sentence executive summary of current state",
  "trend": "BULLISH | BEARISH | NEUTRAL",
  "trendStrength": "Strong | Moderate | Weak",
  "technicals": {
    "support": "Key support price level",
    "resistance": "Key resistance price level",
    "rsiEstimate": "Estimated RSI (oversold <30, overbought >70)",
    "pattern": "Any notable chart pattern if applicable"
  },
  "sentiment": {
    "overall": "Positive | Negative | Mixed",
    "catalysts": ["List of 2-3 potential catalysts or news themes"],
    "risks": ["List of 2-3 key risks"]
  },
  "tradeIdeas": [
    {
      "type": "${isCrypto ? 'Long/Short Spot' : 'Options or Shares'}",
      "direction": "LONG | SHORT",
      "entry": "Entry price or zone",
      "target": "Target price",
      "stopLoss": "Stop loss price",
      "timeframe": "Day trade / Swing / Position",
      "confidence": "High | Medium | Low"
    }
  ],
  "verdict": "One sentence actionable recommendation",
  "riskLevel": "Low | Medium | High"
}
`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    
    res.json({
      success: true,
      data: {
        ticker: normalizedTicker,
        name,
        price,
        change,
        volume,
        rvol: parseFloat(rvol),
        high52,
        low52,
        marketCap,
        assetType: isCrypto ? 'crypto' : 'stock',
        ...analysis,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Quick Analyze Error:", error);
    res.status(500).json({ success: false, error: error.message || "Analysis Failed" });
  }
});

export default router;
