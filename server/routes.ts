import { Express } from "express";
import { createServer, Server } from "http";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { query } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  passport.serializeUser((user: any, done) => done(null, user.id));

  passport.deserializeUser(async (id: any, done) => {
    try {
      // Mapping ispremium from DB to is_premium in code
      const users = await query("SELECT * FROM users WHERE id = $1", [id]);
      if (!users[0]) return done(null, false);
      const user = { ...users[0], is_premium: (users[0] as any).ispremium };
      done(null, user);
    } catch (err) { done(err); }
  });

  passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const users = await query("SELECT * FROM users WHERE email = $1", [email]);
      const user = users[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return done(null, false, { message: "Invalid credentials." });
      }
      return done(null, user);
    } catch (err) { return done(err); }
  }));

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any) => {
      if (err || !user) return res.status(401).json({ message: "Login failed" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  return createServer(app);
}
