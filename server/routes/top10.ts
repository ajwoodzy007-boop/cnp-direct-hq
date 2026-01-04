import express from 'express';
import { db } from '../db.js';
import { historicalPrices, predictionsHistory } from '../../shared/schema.js';
import { desc, sql } from 'drizzle-orm';

const router = express.Router();

// GET /api/top10/stats - Get top 10 performers by price change percentage
router.get('/stats', async (req, res) => {
  try {
    // Get the most recent data for each ticker, calculate price changes
    const recentData = await db
      .select({
        ticker: historicalPrices.ticker,
        date: historicalPrices.date,
        close_price: historicalPrices.close_price,
        volume: historicalPrices.volume
      })
      .from(historicalPrices)
      .orderBy(desc(historicalPrices.date))
      .limit(1000); // Get enough data to cover multiple tickers

    // Group by ticker and get the most recent 2 entries per ticker
    const tickerData: { [key: string]: any[] } = {};
    for (const row of recentData) {
      if (!tickerData[row.ticker]) {
        tickerData[row.ticker] = [];
      }
      if (tickerData[row.ticker].length < 2) {
        tickerData[row.ticker].push(row);
      }
    }

    // Calculate prediction accuracy stats from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const predictionStats = await db
      .select({
        outcome: predictionsHistory.outcome,
        count: sql<number>`count(*)`
      })
      .from(predictionsHistory)
      .where(sql`${predictionsHistory.created_at} >= ${thirtyDaysAgo}`)
      .groupBy(predictionsHistory.outcome);

    let wins = 0;
    let losses = 0;
    predictionStats.forEach(stat => {
      if (stat.outcome === 'WIN') wins = stat.count;
      if (stat.outcome === 'LOSS') losses = stat.count;
    });

    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Check if today's session is still active (has ungraded predictions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activePredictions = await db
      .select({ count: sql<number>`count(*)` })
      .from(predictionsHistory)
      .where(sql`${predictionsHistory.created_at} >= ${today} AND ${predictionsHistory.outcome} IS NULL`);

    const sessionActive = activePredictions[0]?.count > 0;

    // Calculate price changes and sort by performance
    const topPerformers = Object.entries(tickerData)
      .filter(([_, data]) => data.length >= 2)
      .map(([ticker, data]) => {
        const [latest, previous] = data;
        const currentPrice = parseFloat(latest.close_price || '0');
        const prevPrice = parseFloat(previous.close_price || '0');
        const changePercent = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;

        return {
          ticker,
          currentPrice,
          changePercent,
          volume: parseInt(latest.volume || '0'),
          date: latest.date
        };
      })
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        topPerformers,
        winRate: sessionActive ? null : winRate, // Show null if session active
        wins,
        losses,
        sessionActive
      }
    });
  } catch (error) {
    console.error("Top10 stats error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch top performers" });
  }
});

// GET /api/top10/history - Get historical top 10 data
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;

    // Get historical top performers data
    const historicalData = await db
      .select({
        date: historicalPrices.date,
        ticker: historicalPrices.ticker,
        close_price: historicalPrices.close_price
      })
      .from(historicalPrices)
      .orderBy(desc(historicalPrices.date))
      .limit(limit * 10); // Get enough data for analysis

    res.json({
      success: true,
      data: historicalData
    });
  } catch (error) {
    console.error("Top10 history error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch historical data" });
  }
});

export default router;
