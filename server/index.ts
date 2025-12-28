import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import helmet from "helmet"; // 1. ADD THIS IMPORT
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. THE SECURITY FIX: Add this right here!
// This explicitly tells the browser to allow 'eval' for your table rendering
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        "connect-src": ["'self'", "https://www.cnpdirect.com", "wss://www.cnpdirect.com"],
        "img-src": ["'self'", "data:", "https://www.cnpdirect.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// LOGGING MIDDLEWARE... (keep existing code)
app.use((req, res, next) => {
  // ... your existing logging logic ...
  next();
});

// ... rest of your session and passport code ...

(async () => {
  const server = await registerRoutes(app);
  // ... rest of your server code ...
})();
