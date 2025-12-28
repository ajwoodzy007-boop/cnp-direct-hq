import express from 'express';
import { query } from '../db';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * CONSOLIDATED ADMIN FEED
 * This endpoint handles everything the dashboard needs in one fetch.
 * Matches the call seen in: image_9c380e.png
 */
router.get(['/stats', '/overview', '/dashboard'], async (req, res) => {
  try {
    // 1. Fetch live count of registered operatives
    const userCountResult = await query("SELECT COUNT(*) as count FROM users");
    const totalUsers = parseInt(userCountResult[0].count) || 0;

    // 2. Fetch the full list of operatives for the table
    const operatives = await query(
      "SELECT id, email, tier, is_premium, created_at FROM users ORDER BY created_at DESC"
    );

    // 3. The exact data shape your dashboard component is looking for
    const responseData = {
      // Stats Cards Data
      mrr: 1250,              
      arr: 15000,             
      conversionRate: 12.5,   
      aiWinRate: 0, 
      totalUsers: totalUsers, 
      totalSignals: 0,      
      lastSignalGeneration: "09:00 AM ET",
      lastMarketFinalization: "16:30 PM ET",

      // Operative Table Data (Consolidated)
      success: true,
      users: operatives,
      data: operatives // Provided twice for different frontend component versions
    };

    // Return the combined object
    res.json(responseData);
  } catch (error) {
    console.error("Dashboard Data Failure:", error);
    res.status(500).json({ success: false, mrr: 0, totalUsers: 0 });
  }
});

/**
 * REGENERATE PICKS
 *
 */
router.post(['/regenerate', '/picks/regenerate'], async (req, res) => {
  try {
    const freshData = await runMarketScan();
    res.json({ success: true, message: "Sentinel scan initiated", count: Array.isArray(freshData) ? freshData.length : 0 });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * UPDATE USER PERMISSIONS
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

export default router;
