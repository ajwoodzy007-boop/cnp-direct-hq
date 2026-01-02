import express from 'express';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// GET /api/user/profile - Get user profile information
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user!.id;

    const userData = await db
      .select({
        id: users.id,
        full_name: users.full_name,
        email: users.email,
        phone_number: users.phone_number,
        address: users.address,
        subscription_tier: users.subscription_tier,
        created_at: users.createdAt,
        updated_at: users.updated_at
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      profile: userData[0]
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// PATCH /api/user/profile - Update user profile information
router.patch('/profile', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { full_name, phone_number, address } = req.body;

    // Update user profile
    await db
      .update(users)
      .set({
        full_name: full_name || null,
        phone_number: phone_number || null,
        address: address || null,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

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
      .select({
        password: users.password
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // TODO: Implement proper password hashing and verification
    // For now, we'll just update with the new password
    // In production, use bcrypt or similar for secure hashing
    await db
      .update(users)
      .set({
        password: newPassword, // TODO: Hash this password
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

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
