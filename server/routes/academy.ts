import express from 'express';
const router = express.Router();

router.get('/briefing', (req, res) => {
  res.json({
    success: true,
    data: {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      sentiment: 'BULLISH',
      headline: 'Sentinel Detects Institutional Whale Accumulation',
      summary: 'Surveillance indicates high-conviction order flow in tech sectors.',
      keyLevels: 'SPY 590 Support / 615 Resistance',
      actionPlan: 'Focus on high-RVOL tech breakouts.'
    }
  });
});

router.get('/full-report', (req, res) => {
  const user = req.user as any;
  // UPDATED: Check membership_tier === 'admin' instead of tier !== 'admin'
  if (!user || (user.membership_tier !== 'admin' && user.tier !== 'admin' && !user.is_premium)) {
    return res.status(403).json({ success: false, message: 'Premium Required' });
  }
  res.json({
    success: true,
    data: { content: "Deep Analysis: Market pivot confirmed by Sentinel RSI metrics." }
  });
});

export default router;
