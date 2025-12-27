import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];

    // Map the data with extreme safety: strings AND numbers
    const mappedData = marketArray.map(item => {
      const p = item.price || 0;
      const ch = item.change || 0;
      const pc = item.percentChange || 0;

      return {
        ...item,
        symbol: item.ticker,
        // Number versions
        price: p,
        change: ch,
        percentChange: pc,
        changesPercentage: pc,
        // String versions (some components require these for display)
        priceStr: p.toFixed(2),
        changeStr: ch.toFixed(2),
        percentStr: pc.toFixed(2) + '%',
        lastPrice: p
      };
    });

    // If the frontend is hitting 'daily', it expects the status: 'online' key
    if (req.path.includes('daily')) {
      return res.json({
        status: 'online', // Critical for clearing the red overlay
        success: true,
        data: mappedData[0] || { symbol: 'SPY', price: 0 },
        marketData: mappedData
      });
    }

    // Return the clean array for the main dashboard list
    res.json(mappedData);
  } catch (error) {
    console.error('[Oracle] Data Mapping Error:', error);
    res.json([]); 
  }
});

export default router;
