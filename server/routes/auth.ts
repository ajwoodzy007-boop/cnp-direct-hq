import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. REGISTRATION: Forced to bypass any missing table issues
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    // Ensure email is lowercase for consistency
    const userEmail = email.toLowerCase();

    const existing = await query("SELECT * FROM users WHERE email = $1", [userEmail]);
    if (existing.length > 0) return res.status(400).json({ error: "User exists" });

    // Insert with 'password_hash' column we verified earlier
    const result = await query(
      "INSERT INTO users (email, password_hash, is_premium) VALUES ($1, $2, true) RETURNING id, email, is_premium",
      [userEmail, password]
    );

    req.login(result[0], (err) => {
      if (err) return res.status(500).json({ error: "Login failed" });
      return res.json({ success: true, user: result[0] });
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Database registration failed" });
  }
});

// 2. LOGIN STRATEGY
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const users = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = users[0];
    if (!user || user.password_hash !== password) {
      return done(null, false, { message: "Invalid credentials" });
    }
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
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message });
    req.logIn(user, () => res.json({ success: true, user }));
  })(req, res, next);
});

// 3. THE "WHO AM I" ROUTE: Crucial for rendering the dashboard
router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.json(null);
  res.json(req.user);
});

export default router;
