import express from 'express';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/analyze', requirePremium, async (req, res) => {
  const { ticker, rsi, trend, price } = req.body;

  try {
    const prompt = `
      You are 'Sentinel', an institutional trading AI. 
      Analyze ${ticker} based on this data:
      - Price: $${price}
      - RSI (14): ${rsi}
      - Trend: ${trend}
      
      Output a 'Tactical Report' in strict JSON format with these fields:
      1. "verdict": One of [STRONG BUY, BUY, HOLD, SELL, STRONG SELL].
      2. "summary": A 2-sentence professional analysis explaining the verdict based on the indicators.
      3. "risk": A short sentence on the downside risk.
      
      Do not use markdown. Just raw JSON.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    res.json({ success: true, data: aiResponse });

  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ success: false, error: "AI Brain Overload" });
  }
});

export default router;
