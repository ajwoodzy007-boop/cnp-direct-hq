import express from 'express';
// REMOVED Yahoo Finance imports completely to stop ETIMEDOUT errors
import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { RSI } from 'technicalindicators';
import { query } from '../db';

const router = express.Router();

/**
 * Backtest Route - Sanitized
 * Yahoo Finance historical data pulls were timing out.
 * This route is now stabilized to prevent system-wide crashes.
 */
router.post('/', async (req, res) => {
  try {
    const { ticker, days = 30 } = req.body;
    console.log(`[Backtest] Request for ${ticker} over ${days} days - Yahoo Disabled`);

    // Returning a successful but empty response to keep the UI from breaking
    // This allows the rest of the app to stay online for your 16 users
    res.json({
      ticker: ticker?.toUpperCase(),
      days,
      results: [],
      message: "Historical backtesting is temporarily offline for maintenance."
    });
  } catch (error) {
    console.error('[Backtest] Route failed:', error);
    res.status(500).json({ error: 'Backtest engine error' });
  }
});

export default router;
