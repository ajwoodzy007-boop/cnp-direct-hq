import express from 'express';
import axios from 'axios';

const router = express.Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * GET /api/chart/:symbol
 * Fetches 7 days of candle data and returns a structure 
 * that satisfies both array-based and object-based frontend components.
 */
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (7 * 24 * 60 * 60); // 7-day window

    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${start}&to=${end}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );

    const data = response.data;

    // Safety check: if Finnhub is down or returns 'no_data', return an empty hybrid
    if (!data || data.s !== 'ok' || !data.c) {
      const fallback: any = [];
      fallback.data = []; 
      return res.json(fallback);
    }

    // Transform Finnhub candle format into the OS-compatible chart array
    const formattedData = data.c.map((price: number, index: number) => ({
      date: new Date(data.t[index] * 1000).toISOString(),
      price: price,
      symbol: symbol.toUpperCase()
    }));

    // HYBRID RESPONSE: This is the fix for index-Ha37Khn5.js:202
    // It acts as an array for .map() and an object with .data for .slice()
    const hybridResponse: any = [...formattedData];
    hybridResponse.data = formattedData;
    
    res.json(hybridResponse);
  } catch (error) {
    console.error(`[Chart Error] ${symbol}:`, error);
    const errFallback: any = [];
    errFallback.data = [];
    res.json(errFallback);
  }
});

export default router;
