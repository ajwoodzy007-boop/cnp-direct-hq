import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

/**
 * Passport Configuration
 * Configured for Market Sentinel's Email-based login
 */
passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, // CRITICAL: Tells passport to look for "email" in the login form
    async (email, password, done) => {
      try {
        console.log(`[Auth] Login attempt for: ${email}`);
        
        // 1. Find user by email (sanitized to lowercase)
        const users = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        const user = users[0];
        
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // 2. Password Check
        // If you are using hashing, use: await bcrypt.compare(password, user.password)
        if (user.password !== password) {
          return done(null, false, { message: "Invalid email or password" });
        }

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

/**
 * POST /api/auth/login
 * Handles user authentication and session creation
 */
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: info?.message || "Login Failed" 
      });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, username: user.username } 
      });
    });
  })(req, res, next);
});

/**
 * GET /api/auth/user
 * Used by the frontend to check if a session is still active
 */
router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.user);
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true });
  });
});

export default router;
