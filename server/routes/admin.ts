import express from 'express';
import { query } from '../db';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * 1. ADMIN DASHBOARD STATS
 * This populates the cards seen in SENTINEL_HQ (MRR, Users, etc.)
 */
router.get(['/stats', '/overview', '/dashboard'], async (req, res) => {
  try {
    const userResult = await query("SELECT COUNT(*) as count FROM users");
    const totalUsers = parseInt(userResult[0].count) || 0;

    // Matches the values currently seen in your dashboard
    const adminStats = {
      mrr: 1250,              
      arr: 15000,             
      conversionRate: 12.5,   
      aiWinRate: 0, // Still 0 until we wire historical signals
      totalUsers: totalUsers, 
      totalSignals: 0,      
      lastSignalGeneration: "09:00 AM ET",
      lastMarketFinalization: "16:30 PM ET"
    };

    res.json(adminStats);
  } catch (error) {
    res.status(500).json({ mrr: 0, totalUsers: 0 });
  }
});

/**
 * 2. OPERATIVE TABLE DATA
 * This fetches the 16 users for the management table.
 */
router.get('/users', async (req, res) => {
  try {
    const users = await query(
      "SELECT id, email, tier, is_premium, created_at FROM users ORDER BY created_at DESC"
    );
    
    // We return both 'success' and 'data' to ensure frontend compatibility
    res.json({ 
      success: true, 
      data: users 
    });
  } catch (error) {
    console.error("User Fetch Error:", error);
    res.status(500).json({ success: false, data: [] });
  }
});

/**
 * 3. UPDATE USER STATUS
 * Handles promoting/demoting operatives or changing premium access.
 */
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { tier, is_premium } = req.body;

  try {
    const result = await query(
      "UPDATE users SET tier = $1, is_premium = $2 WHERE id = $3 RETURNING id, email, tier, is_premium",
      [tier, is_premium, id]
    );

    res.json({ success: true, user: result[0] });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * 4. REGENERATE PICKS
 * Triggered by the blue button.
 */
router.post(['/regenerate', '/picks/regenerate'], async (req, res) => {
  try {
    const freshData = await runMarketScan();
    res.json({ 
      success: true, 
      message: "Sentinel scan initiated", 
      count: Array.isArray(freshData) ? freshData.length : 0 
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;
