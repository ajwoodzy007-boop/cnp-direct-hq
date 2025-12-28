import express from 'express';
import { query } from '../db';

const router = express.Router();

// Capture all admin-related data requests
router.get(['/stats', '/overview', '/dashboard', '/'], async (req, res) => {
  try {
    // 1. Fetch live user count from the database
    const userResult = await query("SELECT COUNT(*) as count FROM users");
    const totalUsers = parseInt(userResult[0].count) || 0;

    // 2. Fetch or Mock Financials (Matches the cards in image_91c401.png)
    const adminStats = {
      mrr: 1250,           // Populates 'MONTHLY (MRR)' card
      arr: 15000,          // Populates 'ANNUAL (ARR)' card
      conversionRate: 12,  // Populates 'CONVERSION' card
      aiWinRate: 74,       // Populates 'AI WIN RATE' card
      totalUsers: totalUsers, // Populates 'TOTAL USERS' card
      totalSignals: 412,   // Populates 'TOTAL SIGNALS' card
      lastSignalGeneration: "09:00 AM ET",
      lastMarketFinalization: "16:30 PM ET"
    };

    // Return the wrapper the frontend expects
    res.json({ 
      success: true, 
      data: adminStats 
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

export default router;
