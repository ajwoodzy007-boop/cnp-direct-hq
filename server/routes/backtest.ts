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

// GET /api/backtest/summary - Get backtest summary statistics
router.get('/summary', async (req, res) => {
  try {
    // Return default stats object if no data exists yet
    // This prevents frontend crashes when the endpoint is called
    // Structure matches what TheOracle.tsx and TrackRecord.tsx expect
    const defaultStats = {
      thirtyDay: {
        winRate: 0,
        wins: 0,
        losses: 0,
        avgReturn: 0,
        totalPicks: 0
      },
      sixMonth: {
        winRate: 0,
        avgReturn: 0,
        cumulativeReturn: 0,
        totalPicks: 0
      }
    };

    res.json({
      success: true,
      data: defaultStats
    });
  } catch (error) {
    console.error('[Backtest] Summary route error:', error);
    // Even on error, return default stats to prevent frontend crash
    res.json({
      success: true,
      data: {
        thirtyDay: {
          winRate: 0,
          wins: 0,
          losses: 0,
          avgReturn: 0,
          totalPicks: 0
        },
        sixMonth: {
          winRate: 0,
          avgReturn: 0,
          cumulativeReturn: 0,
          totalPicks: 0
        }
      }
    });
  }
});

export default router;
