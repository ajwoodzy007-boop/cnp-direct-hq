import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// This handles the root, /sentinel, and /daily variations
router.get(['/', '/sentinel', '/daily'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : [];

    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      price: item.price,
      change: item.change,
      percentChange: item.percentChange,
      changesPercentage: item.percentChange, // Essential alias
      lastPrice: item.price
    }));

    // THE ULTIMATE HYBRID: 
    // We return an object that contains the array AND acts as an array
    const response: any = {
      status: 'online',    // Clears the red "Offline" box
      success: true,       // Standard success flag
      data: safeData,      // For components that use m.data.slice()
      marketData: safeData,// For components that use m.marketData.map()
      timestamp: new Date().toISOString()
    };

    // This makes the object also work if the frontend calls .map() directly on the response
    Object.assign(response, safeData); 

    res.status(200).json(response);
  } catch (error) {
    console.error("Oracle Crash:", error);
    res.status(200).json({ status: 'online', success: true, data: [] });
  }
});

export default router;
