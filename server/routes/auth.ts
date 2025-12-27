import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. OPTIMIZED REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Step A: Instant check for existing user
    const existing = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Step B: Force insert with premium access
    const result = await query(
      "INSERT INTO users (email, password_hash, is_premium) VALUES ($1, $2, true) RETURNING id, email, is_premium",
      [email, password]
    );

    const newUser = result[0];

    // Step C: Instant Login
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: "Auth system delay. Try logging in now." });
      return res.status(200).json({ success: true, user: newUser });
    });

  } catch (err) {
    console.error("[Register Error]", err);
    res.status(500).json({ error: "Registration failed - Database busy" });
  }
});

// 2. STABLE USER CHECK (Prevents the "Offline" overlay)
router.get("/user", (req, res) => {
  // If not logged in, we send a 200 with 'null' so the frontend knows to show the login screen 
  // instead of showing a red "Offline" error.
  if (!req.isAuthenticated() || !req.user) {
    return res.json(null); 
  }
  res.json(req.user);
});

// ... Keep your existing Passport LocalStrategy and Serializers below ...
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const users = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    const user = users[0];
    if (!user || user.password_hash !== password) return done(null, false, { message: "Invalid credentials" });
    return done(null, user);
  } catch (err) { return done(err); }
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const users = await query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, users[0]);
  } catch (err) { done(err); }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any) => {
    if (err || !user) return res.status(401).json({ success: false });
    req.logIn(user, () => res.json({ success: true, user }));
  })(req, res, next);
});

export default router;
