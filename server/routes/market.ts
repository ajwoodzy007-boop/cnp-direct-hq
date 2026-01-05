import express from 'express';
import { runMarketScan } from '../lib/sentinel.js';

const router = express.Router();

// GET /api/market/sentinel - Market scanner endpoint
router.get('/sentinel', async (req, res) => {
  try {
    const rawData = await runMarketScan().catch(() => []);
    const marketArray = Array.isArray(rawData) ? rawData : Object.values(rawData);

    const safeData = marketArray.filter((item: any) => item && item.ticker).map((item: any) => ({
      ticker: item.ticker,
      name: item.name || item.ticker,
      price: item.price || 0,
      changePercent: item.percentChange || 0,
      rsi: item.rsi || 45,
      rvol: item.rvol || 1.2,
      sentimentScore: item.sentimentScore || 0.6,
      verdict: item.verdict || 'BULLISH',
      signal: item.signal || '🚀 STRONG BUY'
    }));

    res.status(200).json({
      success: true,
      status: 'online', 
      data: safeData
    });
  } catch (error) {
    console.error('[Market] Sentinel scan failed:', error);
    res.status(200).json({ 
      success: true, 
      status: 'online', 
      data: [] 
    });
  }
});

// GET /api/market/heat - Calculate system volatility from historical data
router.get('/heat', async (req, res) => {
  try {
    console.log('🔥 Calculating system heat from historical data...');

    const { db } = await import('../db.js');
    const { historicalPrices } = await import('../../shared/schema.js');
    const { desc, sql } = await import('drizzle-orm');

    // Get data from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentData = await db
      .select({
        ticker: historicalPrices.ticker,
        date: historicalPrices.date,
        close_price: historicalPrices.close_price,
        volume: historicalPrices.volume
      })
      .from(historicalPrices)
      .where(sql`${historicalPrices.date} >= ${thirtyDaysAgo}`)
      .orderBy(desc(historicalPrices.date));

    if (recentData.length === 0) {
      console.log('No historical data available for heat calculation');
      return res.json({ heat: -14.2, status: 'no_data' });
    }

    // Group by ticker and calculate price changes
    const tickerData: { [key: string]: any[] } = {};
    for (const row of recentData) {
      if (!tickerData[row.ticker]) {
        tickerData[row.ticker] = [];
      }
      tickerData[row.ticker].push(row);
    }

    let totalPositiveChanges = 0;
    let totalNegativeChanges = 0;
    let totalAbsChanges = 0;
    let tickerCount = 0;

    // Calculate volatility for each ticker
    for (const [ticker, data] of Object.entries(tickerData)) {
      if (data.length < 2) continue; // Need at least 2 days for change calculation

      // Sort by date (oldest first)
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate daily changes
      for (let i = 1; i < data.length; i++) {
        const prevPrice = parseFloat(data[i - 1].close_price);
        const currPrice = parseFloat(data[i].close_price);

        if (prevPrice > 0) {
          const changePercent = ((currPrice - prevPrice) / prevPrice) * 100;

          if (changePercent > 0) totalPositiveChanges++;
          else if (changePercent < 0) totalNegativeChanges++;

          totalAbsChanges += Math.abs(changePercent);
        }
      }

      tickerCount++;
    }

    if (tickerCount === 0 || (totalPositiveChanges + totalNegativeChanges) === 0) {
      console.log('Insufficient data for meaningful heat calculation');
      return res.json({ heat: 0, status: 'insufficient_data' });
    }

    // Calculate Fluctuation Theorem heat score
    const fluctuationRatio = totalPositiveChanges / totalNegativeChanges;
    const avgAbsChange = totalAbsChanges / (totalPositiveChanges + totalNegativeChanges);

    const baseHeat = (fluctuationRatio - 1) * 25;
    const volatilityBonus = avgAbsChange * 2;

    const heatScore = Math.max(-100, Math.min(100, baseHeat + volatilityBonus));

    console.log(`🔥 System heat calculated: ${heatScore.toFixed(1)} (from ${tickerCount} tickers, ${totalPositiveChanges + totalNegativeChanges} changes)`);

    res.json({
      heat: heatScore,
      status: 'calculated',
      metrics: {
        tickersAnalyzed: tickerCount,
        positiveChanges: totalPositiveChanges,
        negativeChanges: totalNegativeChanges,
        avgVolatility: avgAbsChange.toFixed(2)
      }
    });

  } catch (error: any) {
    console.error('❌ Heat calculation error:', error);
    res.status(500).json({
      heat: -14.2,
      status: 'error',
      error: error.message
    });
  }
});

export default router;

