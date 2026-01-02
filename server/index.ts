import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { setupAuth } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. TRUST PROXY (Crucial for Railway/HTTPS)
app.set("trust proxy", 1);

// ⚡ CORS: Allow production domains and Railway subdomains
const allowedOrigins = [
  'https://www.cnpdirect.com',
  'https://cnpdirect.com',
  'http://localhost:5000',
  'http://localhost:3000',
  /\.railway\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin || origin.includes('localhost');
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

(async () => {
  try {
    // 2. Initialize Auth & Register API Routes
    setupAuth(app);
    const server = await registerRoutes(app);

    // 3. Static Serving Logic
    const rootPath = process.cwd();
    const publicPath = path.resolve(rootPath, "dist", "public");

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // SERVE ASSETS FIRST (No extra middleware)
      app.use("/assets", express.static(path.join(publicPath, "assets"), {
        immutable: true,
        maxAge: "1y",
        fallthrough: false
      }));

      // SERVE OTHER STATIC FILES
      app.use(express.static(publicPath));

      // THE SPA FALLBACK (Must be last - API routes are handled above)
      app.get("*", (req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });
    }

    // 4. GLOBAL ERROR HANDLER
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("🔥 Server Error:", err.message);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`🚀 Sentinel Systems Live on port ${PORT}`);
      console.log(`🔗 API available at: http://localhost:${PORT}/api`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ CRITICAL STARTUP ERROR:", error);
    process.exit(1);
  }
})();