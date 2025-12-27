import express from 'express';
const router = express.Router();

// This route is sanitized to remove yahoo-finance2
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    console.log(`[Chart] Request for ${ticker} - Yahoo Finance disabled`);
    
    // Returning empty results for now so the frontend doesn't crash
    res.json({ 
      ticker: ticker?.toUpperCase(), 
      results: [], 
      message: "Chart data is being migrated to Finnhub" 
    });
  } catch (error) {
    console.error('[Chart] Route error:', error);
    res.status(500).json({ error: 'Chart service temporary offline' });
  }
});

export default router;
