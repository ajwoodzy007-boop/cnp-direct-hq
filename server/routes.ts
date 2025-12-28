import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { query } from "./db";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. PASSPORT SERIALIZATION - MUST BE IN THE SAME SCOPE
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

  // 2. LOCAL LOGIN STRATEGY
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

  // 3. AUTH ENDPOINTS - MOUNTED DIRECTLY AT /api TO FIX "OFFLINE" ERROR
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // 4. MOUNT ADMIN ROUTER
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}
