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
        created_at: users.created_at,
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
    console.log('PROFILE UPDATE REQUEST:', {
      userId: req.user!.id,
      userIdType: typeof req.user!.id,
      body: req.body
    });

    const userId = req.user!.id;
    const { full_name, phone_number, address } = req.body;

    // Convert userId to number if it's a string (handle UUID vs serial mismatch)
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    console.log('Converted userId:', numericUserId, typeof numericUserId);

    // Update user profile
    const updateResult = await db
      .update(users)
      .set({
        full_name: full_name || null,
        phone_number: phone_number || null,
        address: address || null,
        updated_at: new Date()
      })
      .where(eq(users.id, numericUserId));

    console.log('Update result:', updateResult);

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

// DEBUG: Check database schema and user data
router.get('/debug', async (req, res) => {
  try {
    // Check users table structure
    const usersResult = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;`);

    // Check if we have any users
    const userCount = await db.$count(users);

    // Get first user if exists
    const firstUser = userCount > 0 ?
      await db.select().from(users).limit(1) :
      null;

    res.json({
      schema: usersResult,
      userCount,
      firstUser: firstUser ? { ...firstUser[0], password_hash: '[HIDDEN]' } : null
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PROFILE SUCCESS VERIFICATION
router.get('/verify', async (req, res) => {
  try {
    console.log('🔍 Profile Verification Request');

    // Get user count
    const userCount = await db.$count(users);
    console.log(`👥 Total users: ${userCount}`);

    if (userCount === 0) {
      return res.json({
        success: false,
        message: 'No users found in database',
        users: [],
        verification: 'FAILED'
      });
    }

    // Get all user profiles (without sensitive data)
    const userProfiles = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        phone_number: users.phone_number,
        address: users.address,
        subscription_tier: users.subscription_tier,
        created_at: users.created_at,
        updated_at: users.updated_at
      })
      .from(users);

    // Check for complete profiles
    const completeProfiles = userProfiles.filter(user =>
      user.full_name && user.phone_number && user.address
    );

    // Check recent updates
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUpdates = userProfiles.filter(user =>
      user.updated_at && new Date(user.updated_at) > yesterday
    );

    const verification = {
      totalUsers: userCount,
      completeProfiles: completeProfiles.length,
      recentUpdates: recentUpdates.length,
      success: completeProfiles.length > 0,
      message: completeProfiles.length > 0
        ? 'Profile system working correctly!'
        : 'Profile updates may not be working'
    };

    console.log('✅ Verification Results:', verification);

    res.json({
      success: true,
      verification,
      users: userProfiles.map(user => ({
        ...user,
        hasCompleteProfile: !!(user.full_name && user.phone_number && user.address)
      }))
    });

  } catch (error: any) {
    console.error('❌ Profile verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      verification: 'ERROR'
    });
  }
});

export default router;
