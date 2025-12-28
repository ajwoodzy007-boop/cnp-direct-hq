import express from 'express';
import { query } from '../db';

const router = express.Router();

/**
 * ADMIN STATS & OVERVIEW
 * Handles the dashboard cards: MRR, ARR, Conversion, Win Rate, and Total Users.
 *
 */
router.get(['/stats', '/overview', '/dashboard'], async (req, res) => {
  try {
    // 1. Fetch live user count from the database
    const userResult = await query("SELECT COUNT(*) as count FROM users");
    const totalUsers = parseInt(userResult[0].count) || 0;

    // 2. Data structure perfectly aligned to the HQ Dashboard cards
    const adminStats = {
      mrr: 1250,              // Card: MONTHLY (MRR)
      arr: 15000,             // Card: ANNUAL (ARR)
      conversionRate: 12.5,   // Card: CONVERSION
      aiWinRate: 74,          // Card: AI WIN RATE
      totalUsers: totalUsers, // Card: TOTAL USERS
      totalSignals: 412,      // Card: TOTAL SIGNALS
      lastSignalGeneration: "09:00 AM ET",
      lastMarketFinalization: "16:30 PM ET"
    };

    // Return raw object as the dashboard component expects it
    res.json(adminStats);
  } catch (error) {
    console.error("Admin Stats Failure:", error);
    res.status(500).json({ mrr: 0, totalUsers: 0, success: false });
  }
});

/**
 * USER MANAGEMENT
 * Feeds the table of all registered operatives.
 */
router.get('/users', async (req, res) => {
  try {
    const users = await query(
      "SELECT id, email, tier, is_premium, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;
