import express from 'express';
import { db } from '../db.js';
import { predictions, predictionsHistory } from '../../shared/schema.js';
import { desc, sql, eq } from 'drizzle-orm';

const router = express.Router();

// GET /api/oracle/daily - Get latest predictions from predictions table (no date filter)
router.get('/daily', async (req, res) => {
  console.log('ENTERING ROUTE: ', req.path);
  try {
    console.log('--- Querying Predictions Table ---');
    console.log('[Oracle] Checking database connection...');

    // Get today's active predictions only (today-only filtering)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const predictionData = await db
      .select()
      .from(predictions)
      .where(sql`${predictions.created_at} >= ${today}`)
      .orderBy(desc(predictions.created_at))
      .limit(50);

    console.log(`[Oracle] Found ${predictionData?.length || 0} predictions`);

    // Transform database fields to frontend-expected format
    const transformedData = (predictionData || []).map(pred => ({
      id: pred.id, // Add unique ID for button links
      ticker: pred.symbol, // Map symbol -> ticker
      predictedPrice: parseFloat(pred.target_price), // Map target_price -> predictedPrice
      confidenceScore: pred.confidence, // Map confidence -> confidenceScore
      signal: pred.prediction, // Map prediction -> signal
      entryPrice: 0, // Default value, can be enhanced later
      outcome: pred.outcome,
      learning_metadata: pred.learning_metadata,
      created_at: pred.created_at,
      displayDate: new Date(pred.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }) // Formatted date for display
    }));

    console.log(`[Oracle] Transformed ${transformedData.length} predictions for frontend`);

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error: any) {
    console.error("🔥 Server Error: Oracle daily fetch failed:", error.message);
    console.error("🔥 Full error:", error);

    // Safe fail: Return empty array instead of crashing
    res.json({
      success: true,
      data: [],
      error: 'Database temporarily unavailable'
    });
  }
});

        // GET /api/oracle/vault - Get all historical predictions for The Vault
router.get('/vault', async (req, res) => {
  try {
    console.log('[Oracle] Fetching vault (all historical predictions)');

    // Fetch all historical predictions from the archive
    const historicalData = await db
      .select()
      .from(predictionsHistory)
      .orderBy(desc(predictionsHistory.created_at))
      .limit(1000); // Allow viewing up to 1000 historical predictions

    console.log(`[Oracle] Found ${historicalData?.length || 0} historical predictions in vault`);

    // Transform database fields to frontend-expected format
    const transformedData = (historicalData || []).map(pred => ({
      id: pred.id,
      ticker: pred.symbol,
      predictedPrice: parseFloat(pred.target_price),
      confidenceScore: pred.confidence,
      signal: pred.prediction,
      entryPrice: 0,
      outcome: pred.outcome,
      outcome_price: pred.outcome_price ? parseFloat(pred.outcome_price) : null,
      learning_metadata: pred.learning_metadata,
      created_at: pred.created_at,
      displayDate: new Date(pred.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }),
      moved_at: pred.moved_at,
      isArchived: true
    }));

    res.json({
      success: true,
      data: transformedData,
      total: transformedData.length
    });

  } catch (error: any) {
    console.error("🔥 Server Error: Oracle vault fetch failed:", error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vault data'
    });
  }
});

// GET /api/oracle/history/:id - Get specific historical prediction for review
router.get('/history/:id', async (req, res) => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      return res.status(400).json({ success: false, error: 'Invalid prediction ID' });
    }

    console.log(`[Oracle] Fetching historical prediction ${predictionId}`);

    // First try active predictions, then history table
    let prediction = await db
      .select()
      .from(predictions)
      .where(eq(predictions.id, predictionId))
      .limit(1);

    if (prediction.length === 0) {
      // Try history table
      prediction = await db
        .select()
        .from(predictionsHistory)
        .where(eq(predictionsHistory.id, predictionId))
        .limit(1);
    }

    if (prediction.length === 0) {
      return res.status(404).json({ success: false, error: 'Prediction not found' });
    }

    const pred = prediction[0];

    // Transform for frontend
    const transformedData = {
      id: pred.id,
      ticker: pred.symbol,
      predictedPrice: parseFloat(pred.target_price),
      confidenceScore: pred.confidence,
      signal: pred.prediction,
      entryPrice: 0,
      outcome: pred.outcome,
      outcome_price: pred.outcome_price ? parseFloat(pred.outcome_price) : null,
      learning_metadata: pred.learning_metadata,
      created_at: pred.created_at,
      displayDate: new Date(pred.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }),
      // Add archival info if from history
      isArchived: 'moved_at' in pred,
      moved_at: 'moved_at' in pred ? pred.moved_at : null
    };

    console.log(`[Oracle] Found historical prediction for ${transformedData.ticker}`);

    res.json({
      success: true,
      data: transformedData
    });

  } catch (error: any) {
    console.error("🔥 Server Error: Oracle history fetch failed:", error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical prediction'
    });
  }
});

// Fallback route for other oracle endpoints (keeps existing market scan functionality)
router.get('*', async (req, res) => {
  try {
    const { runMarketScan } = await import('../lib/sentinel.js');
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
    res.status(200).json({ 
      success: true, 
      status: 'online', 
      data: [] 
    });
  }
});

export default router;
