import express from 'express';
import YahooFinance from 'yahoo-finance2';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium';

const router = express.Router();
const yf = new YahooFinance();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let shortCache = { timestamp: 0, data: null as any };
let fullCache = { timestamp: 0, data: null as any };

router.get('/briefing', async (req, res) => {
  const now = Date.now();
  if (shortCache.data && (now - shortCache.timestamp < 3600000)) {
    return res.json({ success: true, data: shortCache.data, cached: true });
  }

  try {
    const [spy, qqq, vix, news] = await Promise.all([
      yf.quote('SPY'), yf.quote('QQQ'), yf.quote('^VIX'),
      yf.search('stock market news', { newsCount: 5 })
    ]);

    const headlines = news.news?.map((n: any) => n.title).join('. ') || 'No headlines';
    const marketData = `SPY: ${spy.regularMarketPrice} (${spy.regularMarketChangePercent?.toFixed(2)}%), QQQ: ${qqq.regularMarketPrice}, VIX: ${vix.regularMarketPrice}`;

    const prompt = `
      You are a Trading Commander. Write a "Morning Market Briefing" based on:
      Data: ${marketData}
      News: ${headlines}

      Output strict JSON:
      {
        "sentiment": "BULLISH / BEARISH / NEUTRAL",
        "headline": "Punchy 5-word title",
        "summary": "3-sentence summary.",
        "keyLevels": "SPY Support/Resistance.",
        "actionPlan": "One specific piece of advice."
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const report = JSON.parse(completion.choices[0].message.content || '{}');
    const finalData = { ...report, date: new Date().toLocaleDateString() };
    shortCache = { timestamp: now, data: finalData };
    res.json({ success: true, data: finalData });

  } catch (error) {
    console.error("Briefing Error:", error);
    res.status(500).json({ success: false, error: "Briefing Failed" });
  }
});

router.get('/earnings-scanner', requirePremium, async (req, res) => {
  const watchlist = ['NVDA', 'TSLA', 'NFLX', 'AMD', 'META', 'AMZN', 'GOOGL', 'MSFT', 'AAPL', 'COIN', 'MSTR', 'CRWD'];
  
  try {
    const promises = watchlist.map(async (ticker) => {
      try {
        const summary = await yf.quoteSummary(ticker, { modules: ['calendarEvents', 'price'] });
        const events = summary.calendarEvents;
        
        if (events && events.earnings && events.earnings.earningsDate) {
          const date = new Date(events.earnings.earningsDate[0]);
          const now = new Date();
          const diffTime = date.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 21) {
            return {
              ticker,
              date: date.toLocaleDateString(),
              daysAway: diffDays,
              price: summary.price?.regularMarketPrice
            };
          }
        }
      } catch (e) {
        // Skip individual ticker errors
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
      Act as a Derivatives Specialist. Generate an 'Earnings Play' for ${ticker}.
      Current Price: $${price}
      Earnings Date: ${date}

      Analyze the implied volatility (IV) crush potential.
      
      Output strict JSON:
      {
        "strategy": "Name (e.g. Long Straddle, Iron Condor)",
        "bias": "Directional bias or Neutral?",
        "impliedMove": "Estimated % move based on current pricing",
        "rationale": "Why this strategy? (e.g. 'Market expects 5% move, stock usually moves 8%')",
        "setup": {
          "leg1": "Description of Leg 1",
          "leg2": "Description of Leg 2"
        },
        "risk": "High/Med/Low"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const play = JSON.parse(completion.choices[0].message.content || '{}');
    res.json({ success: true, data: play });

  } catch (error) {
    res.status(500).json({ success: false, error: "Strategy Generation Failed" });
  }
});

router.get('/full-report', requirePremium, async (req, res) => {
  const now = Date.now();
  if (fullCache.data && (now - fullCache.timestamp < 14400000)) {
    return res.json({ success: true, data: fullCache.data, cached: true });
  }

  try {
    const symbols = ['SPY', 'QQQ', 'IWM', '^VIX', '^TNX', 'BTC-USD', 'XLK', 'XLE', 'XLV'];
    const quotes = await Promise.all(symbols.map(s => yf.quote(s).catch(() => ({ symbol: s, regularMarketPrice: 0 }))));
    
    const dataStr = quotes.map((q: any) => 
      `${q.symbol}: $${q.regularMarketPrice} (${q.regularMarketChangePercent?.toFixed(2)}%)`
    ).join('\n');

    const prompt = `
      Act as the Chief Investment Strategist for a hedge fund. Write a comprehensive "Daily Intelligence Report" based on this market data:
      ${dataStr}

      The report must be detailed (approx 800 words) and structured.
      
      Output strict JSON with this structure:
      {
        "title": "Professional Title for Today",
        "date": "Today's Date",
        "sections": [
          { 
            "heading": "1. Executive Summary", 
            "content": "High-level overview of risk-on/risk-off sentiment, VIX analysis, and the main driver of the day."
          },
          { 
            "heading": "2. Macro & Rates (The Big Picture)", 
            "content": "Analyze the 10-Year Yield (^TNX) and its impact on Tech (QQQ) vs Small Caps (IWM). Discuss inflation/Fed expectations."
          },
          { 
            "heading": "3. Sector Rotation Watch", 
            "content": "Analyze flows into Tech (XLK), Energy (XLE), or Healthcare (XLV). Where is the money hiding?"
          },
          { 
            "heading": "4. Crypto & Alternative Assets", 
            "content": "Brief analysis of Bitcoin (BTC-USD) as a liquidity gauge."
          },
          { 
            "heading": "5. The Sentinel Watchlist", 
            "content": "Identify 3 specific setups or price levels to watch on SPY/QQQ. Give concrete numbers."
          },
          { 
            "heading": "6. Commander's Final Note", 
            "content": "Psychological advice for traders today."
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const report = JSON.parse(completion.choices[0].message.content || '{}');
    const finalReport = { ...report, date: new Date().toLocaleDateString() };
    fullCache = { timestamp: now, data: finalReport };
    
    res.json({ success: true, data: finalReport });

  } catch (error) {
    console.error("Full Report Error:", error);
    res.status(500).json({ success: false, error: "Report Generation Failed" });
  }
});

export default router;
