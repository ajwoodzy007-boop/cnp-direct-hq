import express from 'express';
import { query } from '../db';
import { runMarketScan } from '../lib/sentinel'; // Import your scanner logic

const router = express.Router();

// ... existing stats and users routes ...

/**
 * REGENERATE PICKS
 * Triggered by the blue button in SENTINEL_HQ
 */
router.post('/regenerate', async (req, res) => {
  try {
    // 1. Manually trigger the AI market scan
    const freshData = await runMarketScan();
    
    // 2. Log the manual trigger for audit
    console.log(`[ADMIN] Manual pick regeneration triggered by ${req.user?.email}`);

    res.json({ 
      success: true, 
      message: "Sentinel scan initiated successfully",
      count: Array.isArray(freshData) ? freshData.length : 0 
    });
  } catch (error) {
    console.error("Manual Scan Error:", error);
    res.status(500).json({ success: false, message: "Scanner failed to initiate" });
  }
});

export default router;
