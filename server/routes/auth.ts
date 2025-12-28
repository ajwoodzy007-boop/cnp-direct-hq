import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. PASSPORT SERIALIZATION
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    // We select 'tier' and 'is_premium' to match your actual database columns
    const users = await query(
      "SELECT id, email, is_premium, tier FROM users WHERE id = $1", 
      [id]
    );
    
    if (users[0]) {
      // MAPPING: Convert 'tier' into 'is_admin' for frontend compatibility
      const userWithAdminFlag = {
        ...users[0],
        is_admin: users[0].tier === 'admin' 
      };
      done(null, userWithAdminFlag);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err);
  }
});

// 2. AUTHENTICATION STRATEGY
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const users = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        const user = users[0];

        if (!user || user.password_hash !== password) {
          return done(null, false, { message: "Invalid credentials." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// 3. ROUTES
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing[0]) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Insert using your specific columns: tier and is_premium
    const userId = Math.random().toString(36).substring(7); // Simple ID generation
    const result = await query(
      "INSERT INTO users (id, email, password_hash, is_premium, tier) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, is_premium, tier",
      [userId, email.toLowerCase(), password, true, 'pro'] // Default to pro for new users
    );

    const newUser = result[0];
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ message: "Login failed after registration" });
      res.json({ success: true, user: { ...newUser, is_admin: false } });
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

router.post("/login", passport.authenticate("local"), (req, res) => {
  // Map the flag for the immediate login response
  const user: any = req.user;
  res.json({ 
    success: true, 
    user: { ...user, is_admin: user.tier === 'admin' } 
  });
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true });
  });
});

router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // Persistent session mapping
  const user: any = req.user;
  res.json({ ...user, is_admin: user.tier === 'admin' });
});

export default router;
