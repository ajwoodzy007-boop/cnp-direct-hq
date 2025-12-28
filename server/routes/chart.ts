import express from 'express';
import axios from 'axios';

const router = express.Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (7 * 24 * 60 * 60); // 7-day historical lookback

    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${start}&to=${end}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );

    const data = response.data;

    // Safety check: handle empty or invalid API responses
    if (!data || data.s !== 'ok' || !data.c) {
      const fallback: any = [];
      fallback.data = [];
      return res.json(fallback);
    }

    // Transform Finnhub candle data to the format expected by StockChart.tsx
    const formattedData = data.c.map((price: number, index: number) => ({
      date: new Date(data.t[index] * 1000).toISOString(),
      price: price,
      close: price, // Alias for chart libraries
      symbol: symbol.toUpperCase()
    }));

    // HYBRID RESPONSE: Satisfies both direct array mapping and .data.slice()
    const hybridResponse: any = [...formattedData];
    hybridResponse.data = formattedData;
    hybridResponse.success = true;
    
    res.json(hybridResponse);
  } catch (error) {
    console.error(`[Chart Engine] Error for ${symbol}:`, error);
    const errFallback: any = [];
    errFallback.data = [];
    res.json(errFallback);
  }
});

export default router;
