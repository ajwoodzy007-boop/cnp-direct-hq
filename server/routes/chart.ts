import express from 'express';
import axios from 'axios';

const router = express.Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// We use a wildcard and multiple paths to catch any frontend variation
router.get(['/:symbol', '/'], async (req, res) => {
  // Fallback to SPY if no symbol is provided in the URL
  const symbol = (req.params.symbol || 'SPY').toUpperCase();
  
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (7 * 24 * 60 * 60); 

    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${start}&to=${end}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );

    const data = response.data;

    if (!data || data.s !== 'ok' || !data.c) {
      const fallback: any = [];
      fallback.data = []; 
      return res.json(fallback);
    }

    // Map to every possible property name used by charting libraries
    const formattedData = data.c.map((price: number, index: number) => ({
      date: new Date(data.t[index] * 1000).toISOString(),
      time: data.t[index],
      price: price,
      value: price,
      close: price,
      symbol: symbol
    }));

    // The Hybrid Fix that stopped your white screen crashes
    const hybridResponse: any = [...formattedData];
    hybridResponse.data = formattedData;
    hybridResponse.success = true;
    
    res.json(hybridResponse);
  } catch (error) {
    const errFallback: any = [];
    errFallback.data = [];
    res.json(errFallback);
  }
});

export default router;
