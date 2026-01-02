import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";
import * as vite from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${time} [vite] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const viteServer = await vite.createServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const template = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8",
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use absolute path from current working directory (Railway compatible)
  const rootDistPath = path.resolve(process.cwd(), 'dist', 'public');
  console.log('Serving static files from:', rootDistPath);
  console.log('Current working directory:', process.cwd());

  if (!fs.existsSync(rootDistPath)) {
    console.error(`❌ Static assets not found at: ${rootDistPath}`);
    console.error('Files in dist directory:', fs.existsSync(path.resolve(process.cwd(), 'dist')) ? fs.readdirSync(path.resolve(process.cwd(), 'dist')) : 'dist directory not found');
    throw new Error(`Static assets not found at: ${rootDistPath}. Ensure the build step completed successfully.`);
  }

  console.log('✅ Static directory exists. Contents:', fs.readdirSync(rootDistPath));

  // Configure static file serving with proper MIME types and error handling
  app.use('/assets', (req, res, next) => {
    console.log(`Static middleware hit: ${req.path}`);
    const filePath = path.resolve(rootDistPath, 'assets', req.path.replace(/^\/+/, ''));
    console.log(`Looking for file: ${filePath}, exists: ${fs.existsSync(filePath)}`);

    if (fs.existsSync(filePath)) {
      // Set proper content type
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
      console.log(`Serving static file: ${filePath}`);
      res.sendFile(filePath);
    } else {
      console.log(`File not found: ${filePath}`);
      res.status(404).send('File not found');
    }
  });

  // Serve index.html for all other routes (SPA fallback) - exclude assets
  app.get("*", (req, res) => {
    // Don't serve HTML for asset requests - let static middleware handle them
    if (req.path.startsWith('/assets/')) {
      console.log(`Asset request intercepted by catch-all: ${req.path} - this should not happen!`);
      return res.status(404).send('Asset not found');
    }

    console.log(`Serving frontend for route: ${req.path}`);
    const indexPath = path.resolve(rootDistPath, "index.html");

    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send('Frontend not built properly');
    }

    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving index.html:`, err);
        res.status(500).send('Error loading frontend');
      }
    });
  });
}
