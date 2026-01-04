import express from 'express';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium.js';
import { db } from '../db.js';
import { predictionsHistory } from '../../shared/schema.js';
import { sql } from 'drizzle-orm';
// REMOVED Yahoo Finance imports

const router = express.Router();
const openai = new OpenAI();

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

/**
 * GET /api/ai/accuracy-stats - Get prediction accuracy statistics
 * Returns win/loss ratio from the last 30 days of predictions_history
 */
router.get('/accuracy-stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const predictionStats = await db
      .select({
        outcome: predictionsHistory.outcome,
        count: sql<number>`count(*)`
      })
      .from(predictionsHistory)
      .where(sql`${predictionsHistory.created_at} >= ${thirtyDaysAgo}`)
      .groupBy(predictionsHistory.outcome);

    let wins = 0;
    let losses = 0;
    predictionStats.forEach(stat => {
      if (stat.outcome === 'WIN') wins = stat.count;
      else if (stat.outcome === 'LOSS') losses = stat.count;
    });

    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Check if today's session is active (predictions exist for today but not yet graded)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeToday = await db
      .select()
      .from(predictionsHistory)
      .where(sql`${predictionsHistory.created_at} >= ${today} AND ${predictionsHistory.created_at} < ${tomorrow}`)
      .limit(1);

    const sessionActive = activeToday.length > 0;

    res.json({
      success: true,
      data: {
        winRate,
        wins,
        losses,
        sessionActive
      }
    });
  } catch (error: any) {
    console.error('AI accuracy stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to load accuracy stats' });
  }
});

export default router;
