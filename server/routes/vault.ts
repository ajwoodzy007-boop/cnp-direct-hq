import express from 'express';
import OpenAI from 'openai';
import { db } from '../db';
import { playbookSections } from '../../shared/schema';
import { requirePremium } from '../middleware/premium';
import { runMarketScan } from '../lib/sentinel';

// 1. REMOVED Yahoo Finance import to stop build errors
const router = express.Router();
const openai = new OpenAI();

/**
 * Vault Route - Sanitized
 * This handles the Daily Briefing generation using the Finnhub-powered Sentinel.
 */
router.post('/generate-briefing', requirePremium, async (req, res) => {
  try {
    // 2. Pull clean data from our new Finnhub Sentinel
    const marketData = await runMarketScan();
    
    if (!marketData || marketData.length === 0) {
      return res.status(404).json({ error: "No market data available for briefing" });
    }

    // 3. Simple AI prompt to generate the text
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a market analyst. Summarize the provided data into a 3-sentence briefing." },
        { role: "user", content: `Market Data: ${JSON.stringify(marketData.slice(0, 5))}` }
      ],
    });

    const content = response.choices[0].message.content;

    // 4. Save to DB
    const runId = 'b6163ff8-ddd0-4f59-bb9a-08aac1006743';
    await db.insert(playbookSections).values({
      run_id: runId,
      title: 'Daily Intelligence',
      content: content,
      section_type: 'market_briefing'
    });

    console.log('[Vault] Generated and saved briefing to database');

    res.json({ success: true, content });
  } catch (error) {
    console.error('[Vault] Briefing generation failed:', error);
    res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

export default router;
