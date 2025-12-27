import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { query } from "../db";

const router = express.Router();

// 1. THE DEEP FIX: Visit /api/auth/reset-ceo
router.get("/reset-ceo", async (req, res) => {
  try {
    // Look for all users to see what emails actually exist
    const allUsers = await query("SELECT id, email FROM users LIMIT 5");
    console.log("[Auth Audit] Existing users in DB:", allUsers);

    if (allUsers.length === 0) {
      return res.status(404).send("The users table is completely empty. You need to Sign Up first.");
    }

    const targetEmail = "ajwoodzy007@gmail.com";
    const newPass = "password123";

    // Force update the first user found to be YOU
    const firstUserId = allUsers[0].id;
    await query(
      "UPDATE users SET email = $1, password_hash = $2 WHERE id = $3",
      [targetEmail, newPass, firstUserId]
    );

    res.send(`SUCCESS! We found a user (ID: ${firstUserId}) and renamed them to ${targetEmail} with password: ${newPass}`);
  } catch (err) {
    res.status(500).send("Deep Fix Failed: " + err);
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

        if (user.password_hash !== password) {
          return done(null, false, { message: "Invalid password" });
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
