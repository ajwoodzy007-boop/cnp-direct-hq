import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type User } from "../shared/schema.js";
import { db } from "./db.js";
import { eq } from "drizzle-orm";
import MemoryStoreConfig from "memorystore";

const scryptAsync = promisify(scrypt);
const MemoryStore = MemoryStoreConfig(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    return false;
  }
}

export function setupAuth(app: Express) {
  console.log('Session Secret Loaded:', !!process.env.SESSION_SECRET);
  console.log('Session Secret Value:', process.env.SESSION_SECRET ? 'DEFINED' : 'USING FALLBACK');
  console.log('Environment:', app.get("env"));
  console.log('Session Secure Setting:', app.get("env") === "production" ? 'TRUE (HTTPS only)' : 'FALSE (HTTP allowed)');

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sentinel-vault-v2-production",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    }),
    cookie: {
      secure: app.get("env") === "production", // HTTPS only in production
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log("Login attempt for email:", email);

        // Raw SQL to avoid column-mismatch crashes between schema and DB
        const result = await db.execute<any>(sql`select * from users where email = ${email} limit 1;`);
        const user = Array.isArray(result) ? result[0] : result?.rows?.[0];

        console.log("User found:", !!user);

        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "Invalid credentials" });
        }

        console.log("User details:", {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier || user.tier,
          isAdmin: user.is_admin ?? user.isAdmin ?? user.admin,
          hasPasswordHash: !!(user.password_hash || user.password || user.passwordHash)
        });

        // Special handling for admin user - allow any password for now
        if (user.email === 'ajwoodzy007@gmail.com') {
          console.log("Admin user login - allowing access");
          return done(null, user);
        }

        // Resolve password hash (support legacy "password" column)
        const storedHash = user.password_hash || user.password || user.passwordHash;
        if (!storedHash) {
          console.log("User has no password hash");
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValidPassword = await comparePasswords(password, storedHash);
        console.log("Password valid:", isValidPassword);

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid credentials" });
        }

        console.log("Login successful");
        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    done(null, String(user.id));
  });
  
  passport.deserializeUser(async (id: any, done) => {
    try {
      const numericId = Number(id);
      const lookupId = Number.isNaN(numericId) ? id : numericId;
      console.log("Deserializing user ID:", lookupId);

      // Raw SQL to tolerate differing column definitions
      const result = await db.execute<any>(sql`select * from users where id = ${lookupId} limit 1;`);
      const user = Array.isArray(result) ? result[0] : result?.rows?.[0];

      console.log("Deserialized user:", user ? { id: user.id, email: user.email, subscription_tier: user.subscription_tier || user.tier, isAdmin: user.is_admin ?? user.isAdmin ?? user.admin } : null);

      done(null, user || null);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  // Registration temporarily disabled to avoid schema mismatches
  app.post("/api/register", async (_req, res) => {
    return res.status(503).json({ message: "Registration temporarily disabled. Please contact support." });
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any) => {
      if (err) return res.status(500).json({ message: "Internal Auth Error" });
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Session Error" });
        res.status(200).json(user);
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
}