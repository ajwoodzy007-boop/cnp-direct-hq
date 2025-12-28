import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";

const router = Router();

// 1. SERIALIZATION: Essential for persistence
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const users = await query("SELECT id, email, tier, is_premium FROM users WHERE id = $1", [id]);
    if (!users[0]) return done(null, false);
    done(null, users[0]);
  } catch (err) {
    done(err);
  }
});

// 2. STRATEGY
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const users = await query("SELECT * FROM users WHERE email = $1", [email]);
      const user = users[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return done(null, false, { message: "Invalid credentials." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// 3. ROUTES: Mounted directly so /api/login and /api/user work
router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  res.json(req.user);
});

export default router;
