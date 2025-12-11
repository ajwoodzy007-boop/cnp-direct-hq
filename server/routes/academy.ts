import express from 'express';
import YahooFinance from 'yahoo-finance2';
import OpenAI from 'openai';

const router = express.Router();
const yf = new YahooFinance();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let briefingCache = {
  timestamp: 0,
  data: null as any
};

router.get('/briefing', async (req, res) => {
  const now = Date.now();
  
  if (briefingCache.data && (now - briefingCache.timestamp < 3600000)) {
    return res.json({ success: true, data: briefingCache.data, cached: true });
  }

  try {
    const [spy, qqq, vix, news] = await Promise.all([
      yf.quote('SPY'),
      yf.quote('QQQ'),
      yf.quote('^VIX'),
      yf.search('stock market news', { newsCount: 5 })
    ]);

    const headlines = news.news?.map((n: any) => n.title).join('. ') || 'No headlines available';
    const marketData = `SPY: ${spy.regularMarketPrice} (${spy.regularMarketChangePercent?.toFixed(2)}%), QQQ: ${qqq.regularMarketPrice}, VIX: ${vix.regularMarketPrice}`;

    const prompt = `
      You are the Commander of a trading floor. Write a "Morning Market Briefing" based on this data:
      
      Market Data: ${marketData}
      Top News: ${headlines}

      Output strict JSON:
      {
        "sentiment": "BULLISH / BEARISH / NEUTRAL",
        "headline": "A punchy, 5-word title for the day",
        "summary": "A 3-sentence professional summary of what is driving the market.",
        "keyLevels": "SPY Support/Resistance levels based on the price.",
        "actionPlan": "One specific piece of advice for traders today (e.g. 'Watch for volatility')."
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const report = JSON.parse(completion.choices[0].message.content || '{}');
    
    const finalData = { ...report, date: new Date().toLocaleDateString() };

    briefingCache = { timestamp: now, data: finalData };

    res.json({ success: true, data: finalData });

  } catch (error) {
    console.error("Briefing Error:", error);
    res.status(500).json({ success: false, error: "Intelligence Uplink Failed" });
  }
});

export default router;
