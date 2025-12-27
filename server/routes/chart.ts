import express from 'express';
import axios from 'axios';

const router = express.Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * GET /api/chart/:symbol
 * Fetches candle data and provides the 'Hybrid' structure needed
 * to stop any remaining .slice() crashes in the dashboard.
 */
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (7 * 24 * 60 * 60); // 7-day lookback

    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${start}&to=${end}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );

    const data = response.data;

    // Safety: If Finnhub has no data for the symbol, return an empty hybrid structure
    if (!data || data.s !== 'ok' || !data.c) {
      const fallback: any = [];
      fallback.data = []; 
      return res.json(fallback);
    }

    // Transform Finnhub format [c, h, l, o, t, v] into the OS Dashboard format
    const formattedData = data.c.map((price: number, index: number) => ({
      date: new Date(data.t[index] * 1000).toISOString(),
      price: price,
      close: price, // Alias for chart components
      value: price, // Alias for heatmap components
      symbol: symbol
    }));

    // THE HYBRID FIX: Satisfies both Array.map() and Object.data.slice()
    const hybridResponse: any = [...formattedData];
    hybridResponse.data = formattedData;
    hybridResponse.success = true;
    
    res.json(hybridResponse);
  } catch (error) {
    console.error(`[Chart Error] ${symbol}:`, error);
    const errFallback: any = [];
    errFallback.data = [];
    res.json(errFallback);
  }
});

export default router;
