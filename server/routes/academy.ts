import express from 'express';

const router = express.Router();

router.get('/briefing', (req, res) => {
  try {
    // This matches the briefing interface in MarketRadar.tsx
    const dailyIntel = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      sentiment: 'BULLISH', // Can be BULLISH, BEARISH, or NEUTRAL
      headline: 'Market Liquidity Surges as Sentinel Detects Institutional Accumulation',
      summary: 'Sentinel surveillance indicates a significant shift in order flow across major tech tickers. RSI levels suggest a healthy consolidation before the next leg up.',
      keyLevels: 'SPY 590 Support / 610 Resistance',
      actionPlan: 'Maintain long exposure on high-RVOL breakouts; tighten stops on overextended AI names.'
    };

    res.json({
      success: true,
      data: dailyIntel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Briefing decryption failed' });
  }
});

export default router;
