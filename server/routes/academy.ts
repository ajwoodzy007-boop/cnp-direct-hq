import express from 'express';

const router = express.Router();

// Public Briefing - Always accessible
router.get('/briefing', (req, res) => {
  res.json({
    success: true,
    data: {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      sentiment: 'BULLISH',
      headline: 'Sentinel Detects Institutional Whale Accumulation in Tech',
      summary: 'Market surveillance indicates high-conviction order flow. RSI metrics show room for growth before overbought territory.',
      keyLevels: 'SPY 590 Support / 615 Resistance',
      actionPlan: 'Focus on high-RVOL tech breakouts; maintain trailing stops on existing runners.'
    }
  });
});

// Protected Full Report - Requires Premium
router.get('/full-report', (req, res) => {
  const user = req.user as any;

  // If user is not logged in or is not premium, send 403
  if (!user || !user.is_premium) {
    return res.status(403).json({ 
      success: false, 
      message: 'Member access required' 
    });
  }

  // Only sends if user.is_premium is true
  res.json({
    success: true,
    data: {
      id: 1,
      title: "Deep Surveillance Report: Q4 Institutional Pivot",
      content: "Detailed intelligence regarding institutional accumulation patterns...",
      author: "Sentinel AI",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
