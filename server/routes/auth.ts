import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, 
    async (email, password, done) => {
      try {
        console.log(`[Auth Audit] Attempting login for: ${email}`);
        
        // 1. Search both email AND username columns to be safe
        const users = await query(
          "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)", 
          [email]
        );
        
        const user = users[0];
        
        if (!user) {
          console.log(`[Auth Audit] User not found in DB for: ${email}`);
          return done(null, false, { message: "Invalid email or password" });
        }

        // 2. Log found user (Internal only, don't show to users)
        console.log(`[Auth Audit] User found. Matching password...`);

        // 3. Temporary Plain-Text Check (Matches your previous structure)
        if (user.password !== password) {
          console.log(`[Auth Audit] Password mismatch for: ${email}`);
          return done(null, false, { message: "Invalid email or password" });
        }

        console.log(`[Auth Audit] Login Successful: ${email}`);
        return done(null, user);
      } catch (err) {
        console.error(`[Auth Audit] Database Error:`, err);
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

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ success: false, error: info?.message });
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ success: true, user: { id: user.id, email: user.email } });
    });
  })(req, res, next);
});

router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not logged in" });
  res.json(req.user);
});

export default router;
