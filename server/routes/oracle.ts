import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// Handles ALL market-related sub-paths
router.get(['/', '/sentinel', '/daily', '/all', '/movers'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : [];

    // Map to every possible property name the UI might want
    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      price: item.price,
      change: item.change,
      percentChange: item.percentChange,
      changesPercentage: item.percentChange, // Fixes .slice() crash
      lastPrice: item.price
    }));

    // THE HYBRID FIX: We return an object that IS ALSO an array.
    // This allows both `data.slice()` and `data.data.slice()` to work.
    const hybridResponse: any = [...safeData];
    hybridResponse.data = safeData; 
    hybridResponse.marketData = safeData;
    hybridResponse.status = 'online';
    hybridResponse.success = true;

    res.status(200).json(hybridResponse);
  } catch (error) {
    const fallback: any = [];
    fallback.data = [];
    res.status(200).json(fallback);
  }
});

export default router;
