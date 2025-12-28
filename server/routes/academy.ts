import express from 'express';

const router = express.Router();

// Public Briefing (Already working)
router.get('/briefing', (req, res) => {
  res.json({
    success: true,
    data: {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      sentiment: 'BULLISH',
      headline: 'Sentinel Detects Institutional Whale Accumulation in Tech',
      summary: 'Market surveillance indicates high-conviction order flow. RSI metrics show room for growth.',
      keyLevels: 'SPY 590 Support / 615 Resistance',
      actionPlan: 'Focus on high-RVOL tech breakouts.'
    }
  });
});

// Protected Full Report
router.get('/full-report', (req, res) => {
  // Check if user is logged in and has premium status
  const user = req.user as any;

  if (!user || !user.is_premium) {
    // Sending 403 triggers the 'setShowPremiumModal(true)' in MarketRadar.tsx
    return res.status(403).json({ 
      success: false, 
      message: 'Premium Membership Required',
      code: 'PREMIUM_REQUIRED'
    });
  }

  // If they ARE premium, send the real data
  res.json({
    success: true,
    data: {
      content: "Detailed Sentinel Intelligence Analysis...",
      // Add other fields required by FullReportModal.tsx
    }
  });
});

export default router;
