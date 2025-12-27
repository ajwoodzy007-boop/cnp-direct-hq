import express from 'express';
import OpenAI from 'openai';
import { query } from '../db';
import { requirePremium } from '../middleware/premium';
import { runMarketScan } from '../lib/sentinel';
// 1. REMOVED import yf from 'yahoo-finance2'

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/generate-briefing', requirePremium, async (req, res) => {
  try {
    // 2. Use the clean Finnhub data we just fixed
    const marketData = await runMarketScan();
    
    if (!marketData || marketData.length === 0) {
      throw new Error("No market data available for briefing");
    }

    const prompt = `You are a Wall Street analyst. Based on this data: ${JSON.stringify(marketData.slice(0, 5))}, write a 3-sentence market briefing for today. Focus on momentum and volatility.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0].message.content;

    // 3. Save to database so the "Briefing Unavailable" message disappears
    const runId = 'b6163ff8-ddd0-4f59-bb9a-08aac1006743'; // Using your current active ID
    await query(
      "INSERT INTO playbook_sections (run_id, title, content) VALUES ($1, $2, $3)",
      [runId, 'Daily Intelligence', content]
    );

    res.json({ success: true, content });
  } catch (error) {
    console.error('[Vault] Briefing generation failed:', error);
    res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

export default router;
