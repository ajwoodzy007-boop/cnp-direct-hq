import express from 'express';
import { query } from '../db';

const router = express.Router();

// Middleware: Strict Admin-Only Gate
router.use((req, res, next) => {
  const user = req.user as any;
  if (!user || user.tier !== 'admin') {
    return res.status(403).json({ message: "ACCESS_DENIED: Sentinel Admin Clearance Required" });
  }
  next();
});

router.get('/stats', async (req, res) => {
  try {
    // 1. Get Total Users from your DB
    const userCount = await query("SELECT COUNT(*) FROM users");
    
    // 2. Fetch or Mock Financials (MRR/ARR)
    // You can replace these with real subscription logic later
    const stats = {
      mrr: 0,
      arr: 0,
      conversionRate: 0,
      aiWinRate: 68, // Target benchmark
      totalUsers: parseInt(userCount[0].count) || 0,
      totalSignals: 124, // Mock for now until signals table is wired
      lastSignalGeneration: "09:00 AM ET",
      lastMarketFinalization: "16:30 PM ET"
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch admin intelligence" });
  }
});

// Route for the User Management table
router.get('/users', async (req, res) => {
  try {
    const users = await query("SELECT id, email, tier, is_premium, created_at FROM users ORDER BY created_at DESC");
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;
