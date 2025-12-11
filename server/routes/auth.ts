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

router.get('/me', (req, res) => {
  const user = (req.session as any).user;
  if (user) {
    res.json({ authenticated: true, user });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

export default router;
