import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/movers', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    
    // Convert the object { "0": {...} } from your logs into a clean array
    const marketArray = Array.isArray(rawData) 
      ? rawData 
      : Object.values(rawData).filter(item => typeof item === 'object' && item !== null);

    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      changesPercentage: item.percentChange, // Fixed property name for movers
      lastPrice: item.price
    }));

    // PATH 1: If the UI calls /daily or /status, it wants the 'online' wrapper
    if (req.path.includes('daily') || req.path.includes('status')) {
      return res.json({
        status: 'online',
        success: true,
        data: safeData[0] || {}, // "Today's Picks" usually wants the top stock
        marketData: safeData
      });
    }

    // PATH 2: If the UI calls /sentinel or /movers, it wants a RAW ARRAY
    // This stops the '.slice is not a function' error
    res.json(safeData);
    
  } catch (error) {
    res.json([]); // Fail-safe array
  }
});

export default router;
