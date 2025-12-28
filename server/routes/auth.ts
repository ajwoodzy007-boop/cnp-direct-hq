import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";

export function setupAuth(app: Express) {
  // 1. STRATEGY CONFIGURATION
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

  // 2. SERIALIZATION: Save user ID to the session cookie
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // 3. DESERIALIZATION: Use the ID from the cookie to find the user on refresh
  passport.deserializeUser(async (id: number, done) => {
    try {
      const users = await query("SELECT id, email, tier, is_premium FROM users WHERE id = $1", [id]);
      if (!users[0]) return done(null, false);
      done(null, users[0]);
    } catch (err) {
      done(err);
    }
  });
}
