import express from 'express';
import yf from 'yahoo-finance2';

const router = express.Router();

router.get('/', async (req, res) => {
  const { ticker } = req.query;
  
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ success: false, error: "Ticker required" });
  }

  try {
    // Use chart() API (v3) instead of historical()
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    const result = await yf.chart(ticker.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }) as any;

    const quotes = result.quotes || [];
    
    // Format for Recharts
    const chartData = quotes.map((day: any) => ({
      date: new Date(day.date).toISOString().split('T')[0].slice(5),
      price: day.close
    })).filter((d: any) => d.price != null);

    // Determine trend
    const start = chartData[0]?.price || 0;
    const end = chartData[chartData.length - 1]?.price || 0;
    const trend = end >= start ? 'up' : 'down';

    res.json({ success: true, data: chartData, trend });

  } catch (error) {
    console.error('Chart fetch error:', error);
    res.status(500).json({ success: false, error: "Chart data unavailable" });
  }
});

export default router;
