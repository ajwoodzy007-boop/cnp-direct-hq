import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    // Convert the object { "0": {...} } into a clean array [...]
    const marketArray = Array.isArray(rawData) 
      ? rawData 
      : Object.values(rawData).filter(item => typeof item === 'object' && item !== null && 'ticker' in item);

    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      changesPercentage: item.percentChange, // Alias for frontend compatibility
      lastPrice: item.price
    }));

    // If the frontend is hitting 'daily', it expects the 'status' wrapper
    if (req.path.includes('daily')) {
      return res.json({
        status: 'online', 
        success: true,
        data: safeData,
        marketData: safeData
      });
    }

    // IMPORTANT: For 'sentinel', return ONLY the array to prevent .map() crashes
    res.json(safeData);
  } catch (error) {
    console.error("Oracle Error:", error);
    res.json([]); 
  }
});

export default router;
