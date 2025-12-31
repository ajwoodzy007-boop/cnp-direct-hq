import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { getStorage } from "./storage.js";

export function setupAuth(app: Express) {
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

  app.get("/api/user", (req: any, res: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
