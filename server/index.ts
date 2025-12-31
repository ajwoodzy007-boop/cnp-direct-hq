import express from "express";
import session from "express-session"; // Ensure this is imported
import { setupAuth } from "./auth";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. CRITICAL: Trust Proxy for Railway
app.set("trust proxy", 1); 

// 2. CRITICAL: Body Parsers MUST come first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. Mandatory Railway Healthcheck
app.get("/api/health", (_req, res) => res.status(200).send("OK"));

(async () => {
  try {
    const server = createServer(app);

    // 4. AUTH & SESSION MUST BE INITIALIZED HERE
    // setupAuth(app) handles the express-session and passport.session() calls
    await setupAuth(app);

    // 5. API ROUTES
    await registerRoutes(app);

    // 6. Static File Handling for Production
    if (process.env.NODE_ENV === "production") {
      const publicPath = path.resolve(process.cwd(), "dist", "public");
      app.use(express.static(publicPath));
      app.get("*", (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ message: "API Not Found" });
        res.sendFile(path.resolve(publicPath, "index.html"));
      });
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Sentinel OS Online: Port ${PORT}`);
    });

  } catch (error) {
    console.error("STARTUP ERROR:", error);
    process.exit(1);
  }
})();