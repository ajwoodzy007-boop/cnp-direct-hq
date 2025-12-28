import express from 'express';
import { query } from '../db';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * ADMIN STATS & OVERVIEW
 * Feeds the SENTINEL_HQ cards
 */
router.get(['/stats', '/overview', '/dashboard'], async (req, res) => {
  try {
    const userResult = await query("SELECT COUNT(*) as count FROM users");
    const totalUsers = parseInt(userResult[0].count) || 0;

    const adminStats = {
      mrr: 1250,              
      arr: 15000,             
      conversionRate: 12.5,   
      aiWinRate: 74,          
      totalUsers: totalUsers, 
      totalSignals: 412,      
      lastSignalGeneration: "09:00 AM ET",
      lastMarketFinalization: "16:30 PM ET"
    };

    res.json(adminStats);
  } catch (error) {
    res.status(500).json({ mrr: 0, totalUsers: 0 });
  }
});

/**
 * USER MANAGEMENT: FETCH ALL OPERATIVES
 * Feeds the table shown below the stats cards
 */
router.get('/users', async (req, res) => {
  try {
    const users = await query(
      "SELECT id, email, tier, is_premium, created_at FROM users ORDER BY created_at DESC"
    );
    // Returning 'data' array inside the object for frontend compatibility
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch operatives" });
  }
});

/**
 * USER MANAGEMENT: UPDATE OPERATIVE STATUS
 * Handles toggling 'tier' (admin/pro) and 'is_premium'
 */
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { tier, is_premium } = req.body;

  try {
    const result = await query(
      "UPDATE users SET tier = $1, is_premium = $2 WHERE id = $3 RETURNING id, email, tier, is_premium",
      [tier, is_premium, id]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Operative not found" });
    }

    res.json({ success: true, user: result[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/**
 * REGENERATE PICKS
 */
router.post(['/regenerate', '/picks/regenerate'], async (req, res) => {
  try {
    const freshData = await runMarketScan();
    res.json({ success: true, message: "Sentinel scan initiated", count: Array.isArray(freshData) ? freshData.length : 0 });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;
