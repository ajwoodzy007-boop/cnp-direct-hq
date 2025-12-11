import express from 'express';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    user?: string;
  }
}

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn('[AUTH] WARNING: ADMIN_PASSWORD not set. Authentication disabled until configured.');
}

router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ success: false, error: "Authentication not configured" });
  }
  
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.user = 'Commander';
    return res.json({ success: true, msg: "Access Granted" });
  }

  return res.status(401).json({ success: false, error: "Invalid Credentials" });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, msg: "Session Terminated" });
  });
});

router.get('/check', (req, res) => {
  if (req.session.authenticated) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;
