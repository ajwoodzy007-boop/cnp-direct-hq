import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. EMERGENCY RESET ROUTE (Delete this after you log in!)
// Visit: your-site-url/api/auth/reset-ceo
router.get("/reset-ceo", async (req, res) => {
  try {
    const testPassword = "password123"; // This will be your new temporary password
    const email = "ajwoodzy007@gmail.com";
    
    await query(
      "UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2)",
      [testPassword, email]
    );
    
    res.send(`Success! Password for ${email} is now: ${testPassword}. Go to the login page and try it now.`);
  } catch (err) {
    res.status(500).send("Reset failed: " + err);
  }
});

passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, 
    async (email, password, done) => {
      try {
        console.log(`[Auth] Login attempt for: ${email}`);
        const users = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        const user = users[0];
        
        if (!user) return done(null, false, { message: "Invalid email or password" });

        // Plain-text check to match the reset route above
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
