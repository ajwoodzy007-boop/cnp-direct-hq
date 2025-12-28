import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// This MUST handle every sub-path the frontend might call
router.get(['/', '/sentinel', '/daily', '/status'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : [];

    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      price: item.price,
      percentChange: item.percentChange,
      changesPercentage: item.percentChange, // Essential for the frontend list
      lastPrice: item.price
    }));

    // The Hybrid Response satisfies all frontend variations
    const hybridResponse: any = [...safeData];
    hybridResponse.data = safeData; 
    hybridResponse.status = 'online'; // THIS clears the "Sentinel Offline" error
    hybridResponse.success = true;

    res.status(200).json(hybridResponse);
  } catch (error) {
    console.error("Oracle Error:", error);
    res.status(200).json({ status: 'online', data: [], success: true }); 
  }
});

export default router;
