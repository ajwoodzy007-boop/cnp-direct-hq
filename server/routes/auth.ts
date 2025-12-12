import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password required" });
  }

  try {
    const check = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password_hash, tier) VALUES ($1, $2, 'FREE') RETURNING id, email, tier`,
      [email, hash]
    );

    const user = result.rows[0];

    (req.session as any).user = user;
    res.json({ success: true, user });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Signup Failed" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    (req.session as any).user = { id: user.id, email: user.email, tier: user.tier };
    res.json({ success: true, user: (req.session as any).user });

  } catch (e) {
    res.status(500).json({ success: false, error: "Login Error" });
  }
});

router.get('/me', async (req, res) => {
  const user = (req.session as any).user;
  if (user) {
    // Check for active beta pass
    const betaResult = await query(
      `SELECT * FROM beta_passes 
       WHERE redeemed_by = $1 AND expires_at > NOW()`,
      [user.id]
    );
    const hasBetaPass = betaResult.rows.length > 0;
    const betaExpires = hasBetaPass ? betaResult.rows[0].expires_at : null;
    
    // If user has active beta pass, treat them as PREMIUM
    const effectiveTier = hasBetaPass ? 'PREMIUM' : user.tier;
    
    res.json({ 
      authenticated: true, 
      user: { ...user, tier: effectiveTier },
      betaPass: hasBetaPass ? { expires: betaExpires } : null
    });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.post('/redeem-beta', async (req, res) => {
  const user = (req.session as any).user;
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Please log in first" });
  }
  
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, error: "Please enter a code" });
  }
  
  try {
    // Find the pass
    const passResult = await query(
      'SELECT * FROM beta_passes WHERE code = $1',
      [code.toUpperCase().trim()]
    );
    
    if (passResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid code" });
    }
    
    const pass = passResult.rows[0];
    
    // Check if already redeemed
    if (pass.redeemed_by) {
      return res.status(400).json({ success: false, error: "This code has already been used" });
    }
    
    // Redeem the pass
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await query(
      `UPDATE beta_passes 
       SET redeemed_by = $1, redeemed_at = NOW(), expires_at = $2 
       WHERE id = $3`,
      [user.id, expiresAt, pass.id]
    );
    
    // Update session to reflect premium access immediately
    (req.session as any).user.tier = 'PREMIUM';
    (req.session as any).user.betaExpires = expiresAt;
    
    res.json({ 
      success: true, 
      message: "Beta pass activated! You have 7 days of Premium access.",
      expiresAt 
    });
    
  } catch (e) {
    console.error('Redeem beta error:', e);
    res.status(500).json({ success: false, error: "Failed to redeem code" });
  }
});

export default router;
