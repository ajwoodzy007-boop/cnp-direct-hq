import express from 'express';
import axios from 'axios';

const router = express.Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

router.get(['/:symbol', '/'], async (req, res) => {
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

    const formattedData = data.c.map((price: number, index: number) => ({
      date: new Date(data.t[index] * 1000).toISOString(),
      price: price,
      symbol: symbol
    }));

    const hybrid: any = [...formattedData];
    hybrid.data = formattedData;
    res.json(hybrid);
  } catch (error) {
    const errFallback: any = [];
    errFallback.data = [];
    res.json(errFallback);
  }
});

export default router;
