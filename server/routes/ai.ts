import express from 'express';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium';
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

export default router;
