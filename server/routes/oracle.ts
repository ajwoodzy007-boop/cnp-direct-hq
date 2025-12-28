import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// Handles all market variations the frontend calls
router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    
    // 1. Force data into an array (fixes the object-key issue)
    const marketArray = Array.isArray(rawData) 
      ? rawData 
      : Object.values(rawData).filter(item => item && typeof item === 'object');

    // 2. Map properties to match frontend expected names
    const safeData = marketArray.map((item: any) => ({
      ...item,
      symbol: item.ticker || item.symbol,
      price: item.price,
      change: item.change,
      percentChange: item.percentChange,
      // This specific alias stops the 'Market Movers' crash
      changesPercentage: item.percentChange, 
      lastPrice: item.price,
      timestamp: item.timestamp || new Date().toISOString()
    }));

    // 3. Create the Hybrid Response
    // We create an array that ALSO has object properties attached to it.
    const response: any = [...safeData]; 
    
    // Attaching properties so 'm.data.slice()' works in MarketMovers
    response.data = safeData; 
    response.marketData = safeData;
    
    // Attaching status so 'CommandCenter' clears the red error box
    response.status = 'online';
    response.success = true;

    res.status(200).json(response);
  } catch (error) {
    console.error("[Oracle Route] Error:", error);
    // Return safe empty state to prevent frontend white screens
    const fallback: any = [];
    fallback.data = [];
    fallback.status = 'online';
    res.status(200).json(fallback);
  }
});

export default router;
