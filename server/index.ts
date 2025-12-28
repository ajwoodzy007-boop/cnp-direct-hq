import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

// MANDATORY FOR RAILWAY: Trust the first proxy
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SECURITY HEADERS
app.use((req: Request, res: Response, next: NextFunction) => {
  const policy = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.cnpdirect.com; connect-src 'self' https://www.cnpdirect.com wss://www.cnpdirect.com;";
  res.setHeader("Content-Security-Policy", policy);
  next();
});

// HARDENED SESSION FOR RAILWAY HTTPS
app.use(
  session({
    cookie: { 
      maxAge: 86400000, 
      httpOnly: true, 
      secure: true, // Required for Railway HTTPS
      sameSite: "lax",
      path: '/'
    },
    name: 'sentinel_sid', // Custom name to avoid collision
    proxy: true, // Explicitly tell express-session to trust the proxy
    store: new MemoryStore({ checkPeriod: 86400000 }),
    resave: true, // Force resave to ensure session stays alive on refresh
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "market-sentinel-vault-secret",
  })
);

app.use(passport.initialize());
app.use(passport.session());

(async () => {
  const server = await registerRoutes(app);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`[Server] Sentinel OS Live on port ${port}`);
  });
})();
