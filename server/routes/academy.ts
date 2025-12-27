import express from 'express';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium';
// REMOVED Yahoo Finance imports to prevent "crumb" validation errors

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Academy Route - Sanitized
 * Removed legacy Yahoo dependencies that were stalling the AI tutor.
 */
router.get('/lesson/:id', requirePremium, async (req, res) => {
  try {
    const { id } = req.params;
    
    // The academy logic should only rely on OpenAI, not Yahoo stock data
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a trading mentor." },
        { role: "user", content: `Explain the concept for lesson ID: ${id}` }
      ],
    });

    res.json({
      lessonId: id,
      content: response.choices[0].message.content
    });
  } catch (error) {
    console.error('[Academy] Route failed:', error);
    res.status(500).json({ error: 'Lesson unavailable' });
  }
});

export default router;
