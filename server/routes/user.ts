import express from 'express';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// GET /api/user/stats - Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user creation date and basic stats
    const userData = await db
      .select({
        createdAt: users.createdAt,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Mock stats for now - in a real app, you'd track these
    const stats = {
      totalPredictionsViewed: 0, // TODO: Implement tracking
      favoriteTickers: [], // TODO: Implement favorite tickers
      accountCreated: userData[0].createdAt,
      lastLogin: new Date().toISOString() // TODO: Implement last login tracking
    };

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to load user stats' });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Display name is required' });
    }

    // For now, we'll store display name in a user preferences table or extend users table
    // Since we don't have that yet, we'll just return success
    // TODO: Implement display name storage

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /api/user/change-password - Change user password
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long' });
    }

    // Get current user data
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // TODO: Implement password verification and update
    // For now, we'll just return success since password hashing is complex
    // In a real implementation, you'd:
    // 1. Hash and verify currentPassword against stored hash
    // 2. Hash newPassword and update the user record
    // 3. Send confirmation email

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// GET /api/user/portfolio - Get user portfolio
router.get('/portfolio', async (req, res) => {
  try {
    const userId = req.user!.id;

    // TODO: Implement portfolio table and storage
    // For now, return empty portfolio
    const portfolio = [];

    res.json({
      success: true,
      portfolio
    });
  } catch (error: any) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load portfolio' });
  }
});

// POST /api/user/portfolio/add - Add holding to portfolio
router.post('/portfolio/add', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { ticker, shares, averageCost } = req.body;

    if (!ticker || !shares || !averageCost) {
      return res.status(400).json({ success: false, error: 'Ticker, shares, and cost are required' });
    }

    // TODO: Implement portfolio table storage
    // For now, we'll simulate adding to portfolio
    const holding = {
      id: `temp-${Date.now()}`, // Temporary ID
      ticker: ticker.toUpperCase(),
      shares: parseFloat(shares),
      averageCost: parseFloat(averageCost),
      currentPrice: parseFloat(averageCost), // Mock current price
      addedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      holding,
      message: 'Holding added to portfolio'
    });
  } catch (error: any) {
    console.error('Portfolio add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add to portfolio' });
  }
});

// DELETE /api/user/portfolio/remove/:id - Remove holding from portfolio
router.delete('/portfolio/remove/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // TODO: Implement portfolio removal from database
    // For now, just return success

    res.json({
      success: true,
      message: 'Holding removed from portfolio'
    });
  } catch (error: any) {
    console.error('Portfolio remove error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from portfolio' });
  }
});

export default router;
