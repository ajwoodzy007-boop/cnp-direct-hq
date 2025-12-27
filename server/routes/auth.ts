import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. Passport Strategy Configuration
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const users = await query("SELECT * FROM users WHERE username = $1", [username]);
      const user = users[0];
      
      if (!user || user.password !== password) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
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

// 2. Login Route
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ success: false, error: info?.message || "Login Failed" });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.json({ success: true, user: { id: user.id, username: user.username } });
    });
  })(req, res, next);
});

// 3. User Check Route (Stops the "undefined user" frontend error)
router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.user);
});

export default router;
