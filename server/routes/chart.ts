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
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${start}&to=${end}&token=${FINNHUB_KEY}`
    );

    const formatted = response.data.c.map((price: number, i: number) => ({
      date: new Date(response.data.t[i] * 1000).toISOString(),
      price: price
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.json({ success: false, data: [] });
  }
});

export default router;
