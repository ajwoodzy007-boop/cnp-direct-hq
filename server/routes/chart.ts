import express from 'express';
import axios from 'axios';

const router = express.Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * GET /api/chart/:symbol
 * Fixed to return a clean array of price data to prevent .slice() crashes
 */
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    // We use Finnhub Candles (v1/stock/candle) for chart data
    const end = Math.floor(Date.now() / 1000);
    const start = end - (7 * 24 * 60 * 60); // Past 7 days

    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${start}&to=${end}&token=${FINNHUB_KEY}`
    );

    const data = response.data;

    // If Finnhub returns 'no_data' or an error, we return an empty array []
    // to prevent the frontend from crashing on .slice()
    if (data.s !== 'ok' || !data.c) {
      return res.json([]); 
    }

    // Transform Finnhub candle format into the simple array the frontend expects
    const formattedData = data.c.map((price: number, index: number) => ({
      date: new Date(data.t[index] * 1000).toISOString(),
      price: price,
      volume: data.v[index]
    }));

    res.json(formattedData);
  } catch (error) {
    console.error(`[Chart Error] ${symbol}:`, error);
    res.json([]); // Return empty array so .slice() doesn't fail
  }
});

export default router;
