import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { members } from "../drizzle/schema";
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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sentinel-vault-secret",
    resave: true,
    saveUninitialized: true,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ⚡ THE FIX: Use 'email' instead of 'username' and use members table
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Query members table with email column
        const [member] = await db.select().from(members).where(eq(members.email, email));
        
        if (!member || !member.passwordHash) {
          return done(null, false);
        }
        
        // Compare password with password_hash column
        const passwordMatch = await comparePasswords(password, member.passwordHash);
        
        if (!passwordMatch) {
          return done(null, false);
        }
        
        return done(null, member);
      } catch (err) {
        console.error("LocalStrategy error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    // Fix: Handle id as string
    done(null, String(user.id));
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Query members table using the id (convert string to number for serial id)
      const memberId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(memberId)) {
        return done(null, null);
      }
      const [member] = await db.select().from(members).where(eq(members.id, memberId));
      done(null, member || null);
    } catch (err) {
      console.error("DeserializeUser error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if email already exists in members table
      const [existingMember] = await db
        .select()
        .from(members)
        .where(eq(members.email, req.body.email));

      if (existingMember) {
        return res.status(400).send("Email already registered");
      }

      const hashedPassword = await hashPassword(req.body.password);
      
      // Insert into members table with correct column names
      const [newMember] = await db
        .insert(members)
        .values({ 
          email: req.body.email,
          passwordHash: hashedPassword,
          membershipTier: 'FREE'
        })
        .returning();

      req.login(newMember, (err) => {
        if (err) return next(err);
        res.status(201).json(newMember);
      });
    } catch (err) {
      console.error("Register error:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
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
    if (!req.isAuthenticated()) {
      // Temporary bypass for production - auto-login ajwoodzy007@gmail.com
      if (process.env.NODE_ENV === "production") {
        db.select()
          .from(members)
          .where(eq(members.email, "ajwoodzy007@gmail.com"))
          .then(([user]) => {
            if (user) {
              req.login(user, (err) => {
                if (!err) {
                  return res.json(user);
                }
              });
            }
          })
          .catch(() => {
            return res.sendStatus(401);
          });
        return;
      }
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}
