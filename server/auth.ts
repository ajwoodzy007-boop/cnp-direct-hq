import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { members as users, type User } from "../drizzle/schema"; 
import { db } from "./db";
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
    console.error("Password Comparison Crash:", err);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sentinel-vault-v2-production",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    cookie: {
      secure: app.get("env") === "production",
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
        console.log(`🔍 [Auth] Attempting lookup for email: ${email}`);
        
        const [user] = await db.select().from(users).where(eq(users.email, email));
        
        if (!user) {
          console.log("❌ [Auth] User not found in database.");
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValid = await comparePasswords(password, user.passwordHash);
        if (!isValid) {
          console.log("❌ [Auth] Password mismatch.");
          return done(null, false, { message: "Invalid credentials" });
        }

        console.log("✅ [Auth] Login successful for:", email);
        return done(null, user);
      } catch (err) {
        console.error("💥 [Auth] Critical Login Error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    done(null, String(user.id));
  });
  
  passport.deserializeUser(async (id: any, done) => {
    try {
      // Convert id from string (serialized) to number (database uses integer)
      const userId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(userId)) {
        return done(null, null);
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      done(null, user || null);
    } catch (err) {
      console.error("DeserializeUser error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Generate hashed password
      const hashedPassword = await hashPassword(password);
      
      // ⚡ TEMPORARY: Log the hashed password for database format reference
      console.log("🔑 [Register] Generated hashedPassword:", hashedPassword);
      console.log("🔑 [Register] Format: <hex_hash>.<hex_salt>");
      console.log("🔑 [Register] This is what should be stored in password_hash column");

      // Insert new user into members table
      const [newUser] = await db
        .insert(users)
        .values({
          email: email,
          passwordHash: hashedPassword,
          membershipTier: 'FREE'
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) return next(err);
        res.status(201).json(newUser);
      });
    } catch (err) {
      console.error("Register error:", err);
      next(err);
    }
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
