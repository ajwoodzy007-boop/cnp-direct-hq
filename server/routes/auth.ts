import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// EMERGENCY RESET: Tries common column names to force the reset
router.get("/reset-ceo", async (req, res) => {
  const email = "ajwoodzy007@gmail.com";
  const newPass = "password123";
  const possibleColumns = ['password_hash', 'hashed_password', 'hash', 'pass'];

  try {
    console.log(`[Reset] Attempting to find correct column for ${email}`);
    
    for (const col of possibleColumns) {
      try {
        // Try to update each possible column name
        const result = await query(
          `UPDATE users SET ${col} = $1 WHERE LOWER(email) = LOWER($2)`,
          [newPass, email]
        );
        return res.send(`SUCCESS! Column was "${col}". Your password is now: ${newPass}`);
      } catch (e) {
        // Continue if the column doesn't exist
        continue;
      }
    }
    res.status(404).send("Could not find any password-related columns in your 'users' table.");
  } catch (err) {
    res.status(500).send("Reset Error: " + err);
  }
});

passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, 
    async (email, password, done) => {
      try {
        const users = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        const user = users[0];
        
        if (!user) return done(null, false, { message: "User not found" });

        // DYNAMIC PASS CHECK: Checks whatever column actually contains the string
        const passMatch = user.password === password || 
                         user.password_hash === password || 
                         user.hashed_password === password;

        if (!passMatch) return done(null, false, { message: "Invalid password" });

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
