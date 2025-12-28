import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { query } from "./db";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. PASSPORT CONFIGURATION (IN-LINE TO PREVENT BUILD ERRORS)
  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const users = await query("SELECT id, email, tier, is_premium FROM users WHERE id = $1", [id]);
      done(null, users[0] || false);
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

  // 2. MOUNT AUTH ROUTES DIRECTLY
  app.post("/api/login", passport.authenticate("local"), (req, res) => res.json(req.user));
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => { if (err) return next(err); res.sendStatus(200); });
  });
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // 3. MOUNT ADMIN ROUTER
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}
