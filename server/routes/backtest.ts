import express from 'express';
// REMOVED Yahoo Finance imports completely
import { RSI } from 'technicalindicators';

const router = express.Router();

/**
 * Backtest Route - Sanitized
 * Historical data testing is being migrated from Yahoo to Finnhub.
 * Gutted to prevent 'yahoo-finance2' resolution errors during build.
 */
router.post('/', async (req, res) => {
  try {
    const { ticker, timeframe = '30d' } = req.body;
    console.log(`[Backtest] Request for ${ticker} (${timeframe}) - Yahoo Disabled`);

    // Returning success with empty data to keep the UI from crashing
    res.json({
      ticker: ticker?.toUpperCase(),
      timeframe,
      results: [],
      metrics: {
        winRate: 0,
        totalTrades: 0,
        profitFactor: 0
      },
      message: "Backtesting engine is undergoing maintenance."
    });
  } catch (error) {
    console.error('[Backtest] Route error:', error);
    res.status(500).json({ error: 'Backtest service offline' });
  }
});

export default router;
