import express from 'express';
import OpenAI from 'openai';
import { db } from '../db.js';
import { predictionsHistory } from '../../shared/schema.js';
import { sql } from 'drizzle-orm';
import { requirePremium } from '../middleware/premium.js';
// REMOVED Yahoo Finance imports

const router = express.Router();
const openai = new OpenAI();

// GET /api/ai/accuracy-stats - Get global signal accuracy
router.get('/accuracy-stats', async (req, res) => {
  console.log('📡 [API] Fetching AI Accuracy Stats...');
  try {
    // Calculate win rate from history
    const result = await db.execute(sql`
      SELECT 
        (COUNT(*) FILTER (WHERE outcome = 'WIN')::float / NULLIF(COUNT(*), 0)) * 100 as "winRate",
        COUNT(*) FILTER (WHERE outcome = 'WIN') as wins,
        COUNT(*) FILTER (WHERE outcome = 'LOSS') as losses
      FROM predictions_history
    `);

    const stats = result.rows[0] as { winRate: number | null, wins: number, losses: number };
    const winRate = stats.winRate ? parseFloat(stats.winRate.toString()) : 0;

    res.json({
      success: true,
      data: {
        winRate: Number(winRate.toFixed(1)),
        wins: Number(stats.wins),
        losses: Number(stats.losses)
      }
    });
  } catch (error) {
    console.error('[AI] Accuracy stats failed:', error);
    res.status(500).json({ 
      success: false, 
      data: { winRate: 0, wins: 0, losses: 0 },
      error: 'Failed to calculate accuracy' 
    });
  }
});

/**
 * AI Route - Sanitized
 * Handles the "AI Strategist" chat logic without Yahoo Finance dependencies.
 */
router.post('/chat', requirePremium, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are the Market Sentinel AI. You provide technical analysis based on price action and RSI." },
        ...history,
        { role: "user", content: message }
      ],
    });

    res.json({ 
      answer: response.choices[0].message.content 
    });
  } catch (error) {
    console.error('[AI Chat] Route failed:', error);
    res.status(500).json({ error: 'AI service temporary offline' });
  }
});

export default router;
