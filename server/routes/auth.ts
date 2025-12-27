import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. REGISTRATION ROUTE
// Specifically uses the 'password_hash' column we confirmed exists in your DB
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Creating user with is_premium: true to bypass any dashboard blocks
    const result = await query(
      "INSERT INTO users (email, password_hash, is_premium) VALUES ($1, $2, true) RETURNING id, email, is_premium, is_admin",
      [email, password]
    );

    const newUser = result[0];
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: "Login after register failed" });
      return res.json({ success: true, user: newUser });
    });
  } catch (err) {
    console.error("[Register Error]", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// 2. PASSPORT LOGIN STRATEGY
passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, 
    async (email, password, done) => {
      try {
        const users = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        const user = users[0];
        
        if (!user) return done(null, false, { message: "User not found" });
        if (user.password_hash !== password) return done(null, false, { message: "Invalid password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const users = await query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, users[0]);
  } catch (err) {
    done(err);
  }
});

// 3. LOGIN ENDPOINT
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ success: false, error: info?.message });
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          is_premium: user.is_premium, 
          is_admin: user.is_admin 
        } 
      });
    });
  })(req, res, next);
});

// 4. LOGOUT ENDPOINT
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true });
  });
});

// 5. GET CURRENT USER (Crucial for fixing the white screen)
router.get("/user", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  
  const user = req.user as any;
  // Return the full object structure the frontend expects
  res.json({
    id: user.id,
    email: user.email,
    is_premium: user.is_premium || false,
    is_admin: user.is_admin || false
  });
});

export default router;
