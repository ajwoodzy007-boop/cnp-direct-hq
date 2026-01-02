import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ⚡ TRUST PROXY: Essential for cookies/sessions on Railway
app.set("trust proxy", 1);

// ⚡ CORS: Allow Railway domains and localhost for development
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);

    // Allow Railway domains (*.railway.app)
    if (origin.includes('railway.app')) return callback(null, true);

    // Reject other origins
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

(async () => {
  try {
    // 1. Initialize Auth system
    setupAuth(app);

    // 2. Register application routes
    const server = await registerRoutes(app);

    // 3. Error handling
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // 4. Serving logic (Vite or Static)
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`🚀 Sentinel Systems Live on port ${PORT}`);
      console.log(`🔗 API available at: http://localhost:${PORT}/api`);
      console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ CRITICAL STARTUP ERROR:", error);
    process.exit(1);
  }
})();