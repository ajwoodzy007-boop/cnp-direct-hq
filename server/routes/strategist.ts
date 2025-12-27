import express from 'express';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium';
// REMOVED Yahoo Finance imports

const router = express.Router();
const openai = new OpenAI();

/**
 * Strategist Route - Sanitized
 * Removed legacy Yahoo dependencies.
 */
router.post('/analyze', requirePremium, async (req, res) => {
  try {
    res.json({ 
      message: "Strategist is updating data sources. Please check back shortly." 
    });
  } catch (error) {
    console.error('[Strategist] Route failed:', error);
    res.status(500).json({ error: 'Strategist service error' });
  }
});

export default router;
