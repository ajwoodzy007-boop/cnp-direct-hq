import express from 'express';
const router = express.Router();

/**
 * Chart Route - Sanitized
 * Yahoo Finance is disabled to prevent ETIMEDOUT crashes.
 */
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    console.log(`[Chart] Request for ${ticker} - Data source migrating to Finnhub`);
    
    // Returning empty results for now to allow the build to pass.
    res.json({ 
      ticker: ticker?.toUpperCase(), 
      results: [], 
      message: "Chart data is being migrated" 
    });
  } catch (error) {
    console.error('[Chart] Route error:', error);
    res.status(500).json({ error: 'Chart service temporary offline' });
  }
});

export default router;
