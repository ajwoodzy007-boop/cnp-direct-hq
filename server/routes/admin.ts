import express from 'express';
import { query } from '../db';
// REMOVED Yahoo Finance imports

const router = express.Router();

/**
 * Admin Route - Sanitized
 * Used for managing the 16 users and system health.
 * Yahoo dependencies removed to prevent dashboard lockouts.
 */
router.get('/stats', async (req, res) => {
  try {
    // Basic health check for the admin panel
    const userCount = await query('SELECT COUNT(*) FROM users');
    const scanCount = await query('SELECT COUNT(*) FROM playbook_sections');

    res.json({
      systemStatus: 'online',
      activeUsers: userCount[0]?.count || 0,
      totalScans: scanCount[0]?.count || 0,
      dataEngine: 'Finnhub'
    });
  } catch (error) {
    console.error('[Admin] Stats fetch failed:', error);
    res.status(500).json({ error: 'Admin dashboard error' });
  }
});

export default router;
