import express from 'express';
import * as YahooFinanceModule from 'yahoo-finance2';

const YahooFinance = (YahooFinanceModule as any).default || YahooFinanceModule;
const router = express.Router();
const yf = new YahooFinance();

router.get('/', async (req, res) => {
  const { ticker } = req.query;
  
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ success: false, error: "Ticker required" });
  }

  try {
    console.log(`[Chart API] Fetching history for: ${ticker}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const chartData = await yf.chart(ticker.toUpperCase(), { 
      period1: startDate,
      period2: endDate,
      interval: '1d' 
    }) as any;

    const quotes = chartData?.quotes || [];
    
    if (!quotes || quotes.length === 0) {
      console.warn(`[Chart API] No history found for ${ticker}`);
      return res.status(404).json({ success: false, error: "No history found" });
    }

    const data = quotes.map((day: any) => ({
      date: new Date(day.date).toISOString().split('T')[0].slice(5),
      price: day.close
    })).filter((d: any) => d.price != null);

    const startPrice = data[0]?.price || 0;
    const endPrice = data[data.length - 1]?.price || 0;
    const trend = endPrice >= startPrice ? 'up' : 'down';

    console.log(`[Chart API] Success: Sent ${data.length} candles for ${ticker}`);
    res.json({ success: true, data, trend });

  } catch (error: any) {
    console.error(`[Chart API] CRASH on ${ticker}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
