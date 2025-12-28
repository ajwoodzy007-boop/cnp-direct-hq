import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";

const router = Router();

// This "packs" your ID into the cookie when you login
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// This "unpacks" your ID on every refresh to keep you logged in
passport.deserializeUser(async (id: number, done) => {
  try {
    const users = await query("SELECT id, email, tier, is_premium FROM users WHERE id = $1", [id]);
    if (!users[0]) return done(null, false);
    done(null, users[0]);
  } catch (err) {
    done(err);
  }
});

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

router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

// The frontend hits this to check if you are still logged in
router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  res.json(req.user);
});

export default router;
