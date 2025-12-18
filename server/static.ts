import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use process.cwd() for production since __dirname in bundled CJS may be incorrect
  const distPath = path.join(process.cwd(), "dist", "public");
  
  console.log(`[Static] Looking for build directory at: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(`[Static] ERROR: Build directory not found at: ${distPath}`);
    console.error(`[Static] Current working directory: ${process.cwd()}`);
    console.error(`[Static] Directory contents:`, fs.readdirSync(process.cwd()));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`[Static] Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
