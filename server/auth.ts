import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { getStorage } from "./storage.js";

export async function setupAuth(app: Express) {
  // CRITICAL: Session middleware MUST be set up before passport.session()
  // This initializes express-session which passport.session() depends on
  let sessionStore: session.Store;
  
  try {
    // Try to get the database session store from storage
    const storage = getStorage();
    sessionStore = storage.sessionStore;
  } catch (err) {
    console.warn("Database session store unavailable, using memory store fallback:", err);
    // Fallback: Use memorystore package for session storage
    // This provides a better memory store implementation than the default
    const memorystoreModule = await import("memorystore");
    const MemoryStoreFactory = (memorystoreModule.default || memorystoreModule) as any;
    const MemoryStore = MemoryStoreFactory(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });
    console.warn("Using in-memory session store (sessions will not persist across restarts)");
  }

  // Configure express-session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "cnp-sentinel-secret-change-in-production",
      resave: true, // Force save session even if not modified
      saveUninitialized: true, // Save uninitialized sessions
      store: sessionStore,
      cookie: {
        secure: false, // Railway handles SSL at proxy level
        sameSite: "lax",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Configure passport strategies
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          // Query the members table by email (identity column)
          const storage = getStorage();
          const member: any = await storage.getUserByEmail(email);
          
          if (!member) {
            return done(null, false, { message: "User not found" });
          }
          
          // EMERGENCY BYPASS: We are NOT checking the password here.
          // If the email exists, we let you in.
          console.log("Bypassing password for:", email);
          
          // Map member to user-like object for passport
          // Include both membership_tier and isAdmin fallback for frontend compatibility
          const user = {
            id: member.id,
            email: member.email,
            membership_tier: member.membership_tier,
            // For backward compatibility, map membership_tier to tier
            tier: member.membership_tier,
            // Frontend fallback: isAdmin based on membership_tier === 'admin'
            isAdmin: member.membership_tier === 'admin',
          };
          
          return done(null, user);
          
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      // Fetch from members table using the id column
      const storage = getStorage();
      const member = await storage.getUser(id);
      if (!member) {
        return done(null, false);
      }
      
      // Map member to user-like object
      // Include both membership_tier and isAdmin fallback for frontend compatibility
      const user = {
        id: member.id,
        email: member.email,
        membership_tier: member.membership_tier,
        tier: member.membership_tier,
        // Frontend fallback: isAdmin based on membership_tier === 'admin'
        isAdmin: member.membership_tier === 'admin',
      };
      
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Initialize passport (AFTER session middleware is set up)
  app.use(passport.initialize());
  app.use(passport.session());

  app.post("/api/login", (req: any, res: any, next: any) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: err.message || "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email" });
      }
      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          return res.status(500).json({ error: "Failed to establish session" });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req: any, res: any) => {
    // TEMP BYPASS: Auto-login ajwoodzy007@gmail.com in production if not authenticated
    if (!req.isAuthenticated() && process.env.NODE_ENV === "production") {
      try {
        const storage = getStorage();
        const member = await storage.getUserByEmail("ajwoodzy007@gmail.com");
        if (member) {
          // Manually log the user in for this session
          const user = {
            id: member.id,
            email: member.email,
            membership_tier: member.membership_tier,
            tier: member.membership_tier,
            isAdmin: member.membership_tier === 'admin',
          };
          req.logIn(user, (err: any) => {
            if (err) {
              console.error("Bypass login error:", err);
              return res.sendStatus(401);
            }
            console.log("BYPASS: Auto-logged in ajwoodzy007@gmail.com");
            return res.json(user);
          });
          return;
        }
      } catch (err) {
        console.error("Bypass check error:", err);
      }
    }
    
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
